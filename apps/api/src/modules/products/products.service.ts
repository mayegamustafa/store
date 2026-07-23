import { Injectable, NotFoundException, ForbiddenException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductStatus } from '@prisma/client';
import OpenAI from 'openai';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private subscriptions: SubscriptionsService,
  ) {}

  // ── List Products (Public) ────────────────────────────────────────────────────
  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    featured?: boolean;
    sellerId?: string;
  }) {
    const { page = 1, limit = 20, search, categoryId, minPrice, maxPrice, sortBy, featured, sellerId } = query;
    const _page  = Number(page)  || 1;
    const _limit = Number(limit) || 20;
    const skip = (_page - 1) * _limit;

    // ── Fuzzy search path (uses pg_trgm similarity) ──────────────────────────
    if (search && search.trim().length >= 2) {
      const term = search.trim();
      const conditions: string[] = [`p.status = 'APPROVED'`];
      const params: any[] = [];
      let paramIdx = 1;

      // Category filter
      if (categoryId) {
        conditions.push(`p."categoryId" = $${paramIdx}`);
        params.push(categoryId);
        paramIdx++;
      }
      // Price filters
      if (minPrice !== undefined) {
        conditions.push(`p."basePrice" >= $${paramIdx}`);
        params.push(minPrice);
        paramIdx++;
      }
      if (maxPrice !== undefined) {
        conditions.push(`p."basePrice" <= $${paramIdx}`);
        params.push(maxPrice);
        paramIdx++;
      }
      if (featured) conditions.push(`p."isFeatured" = true`);

      const termParam = `$${paramIdx}`;
      params.push(term);
      paramIdx++;

      // Match via trigram similarity OR basic ILIKE for short queries
      conditions.push(
        `(similarity(p.name, ${termParam}) > 0.15 OR p.name ILIKE '%' || ${termParam} || '%' OR p.description ILIKE '%' || ${termParam} || '%')`,
      );

      const whereSql = conditions.join(' AND ');

      let orderSql: string;
      switch (sortBy) {
        case 'price_asc':  orderSql = `p."basePrice" ASC`; break;
        case 'price_desc': orderSql = `p."basePrice" DESC`; break;
        case 'rating':     orderSql = `p.rating DESC`; break;
        case 'newest':     orderSql = `p."createdAt" DESC`; break;
        case 'bestseller': orderSql = `p."totalSold" DESC`; break;
        default:           orderSql = `similarity(p.name, ${termParam}) DESC, p."createdAt" DESC`;
      }

      const countResult = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT count(*)::bigint AS count FROM products p WHERE ${whereSql}`,
        ...params,
      );
      const total = Number(countResult[0]?.count ?? 0);

      const rows = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT p.id FROM products p WHERE ${whereSql} ORDER BY ${orderSql} LIMIT ${_limit} OFFSET ${skip}`,
        ...params,
      );
      const ids = rows.map((r) => r.id);

      const products = ids.length
        ? await this.prisma.product.findMany({
            where: { id: { in: ids } },
            include: {
              category: { select: { id: true, name: true, slug: true } },
              seller: { select: { id: true, storeName: true, storeSlug: true, storeLogo: true, rating: true } },
              variants: true,
            },
          }).then((list) => {
            // preserve similarity order
            const map = new Map(list.map((p) => [p.id, p]));
            return ids.map((id) => map.get(id)).filter(Boolean);
          })
        : [];

      return {
        data: products,
        meta: { total, page: _page, limit: _limit, totalPages: Math.ceil(total / _limit) },
      };
    }

    // ── Standard (non-search) path ──────────────────────────────────────────────
    const where: any = { status: ProductStatus.APPROVED };
    if (categoryId) where.categoryId = categoryId;
    if (sellerId) where.sellerId = sellerId;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {};
      if (minPrice !== undefined) where.basePrice.gte = minPrice;
      if (maxPrice !== undefined) where.basePrice.lte = maxPrice;
    }
    if (featured) where.isFeatured = true;

    const orderBy: any = {};
    switch (sortBy) {
      case 'price_asc':  orderBy.basePrice = 'asc'; break;
      case 'price_desc': orderBy.basePrice = 'desc'; break;
      case 'rating':     orderBy.rating = 'desc'; break;
      case 'newest':     orderBy.createdAt = 'desc'; break;
      case 'bestseller': orderBy.totalSold = 'desc'; break;
      default:           orderBy.createdAt = 'desc';
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: _limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, storeName: true, storeSlug: true, storeLogo: true, rating: true } },
          variants: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: { total, page: _page, limit: _limit, totalPages: Math.ceil(total / _limit) },
    };
  }

  // ── Get Single Product ────────────────────────────────────────────────────────
  async findOne(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        seller: {
          select: {
            id: true, storeName: true, storeSlug: true, storeLogo: true,
            storeDescription: true, rating: true, reviewCount: true,
            totalOrders: true, createdAt: true,
            storeCategory: true, isOfficial: true, userId: true,
          },
        },
        variants: true,
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ── Create Product (Seller) ───────────────────────────────────────────────────
  // Note: `userId` is the seller's User.id (from JWT). We resolve to SellerProfile.id
  // before insertion — Product.sellerId is FK to SellerProfile, not User.

  /**
   * Whitelist + normalize incoming product fields. Clients have sent stray
   * keys (`price`, `category` as free text) that crashed Prisma's create with
   * unknown-argument errors; accept known fields only and map legacy aliases.
   */
  private sanitizeProductDto(dto: any): Record<string, any> {
    const out: Record<string, any> = {};
    const num = (v: any) => (v === '' || v == null ? undefined : Number(v));
    if (dto.name != null) out.name = String(dto.name);
    if (dto.description != null) out.description = String(dto.description);
    const basePrice = num(dto.basePrice ?? dto.price);
    if (basePrice != null && !Number.isNaN(basePrice)) out.basePrice = basePrice;
    const comparePrice = num(dto.comparePrice);
    if (comparePrice != null && !Number.isNaN(comparePrice)) out.comparePrice = comparePrice;
    const cost = num(dto.cost);
    if (cost != null && !Number.isNaN(cost)) out.cost = cost;
    const stock = num(dto.stock);
    if (stock != null && !Number.isNaN(stock)) out.stock = Math.max(0, Math.trunc(stock));
    if (dto.categoryId != null && dto.categoryId !== '') out.categoryId = String(dto.categoryId);
    if (Array.isArray(dto.images)) out.images = dto.images.map(String);
    if (dto.thumbnailUrl != null) out.thumbnailUrl = dto.thumbnailUrl || null;
    if (dto.videoUrl !== undefined) out.videoUrl = dto.videoUrl || null;
    if (dto.adVideoUrl !== undefined) out.adVideoUrl = dto.adVideoUrl || null;
    if (Array.isArray(dto.tags)) out.tags = dto.tags.map(String);
    if (dto.sku !== undefined) out.sku = dto.sku || null;
    if (dto.barcode !== undefined) out.barcode = dto.barcode || null;
    if (dto.brand !== undefined) out.brand = dto.brand || null;
    if (dto.condition !== undefined) out.condition = dto.condition || null;
    if (dto.weight !== undefined) out.weight = num(dto.weight) ?? null;
    if (dto.dimensions !== undefined) out.dimensions = dto.dimensions || null;
    if (dto.discountType !== undefined) out.discountType = dto.discountType || null;
    if (dto.discountValue !== undefined) out.discountValue = num(dto.discountValue) ?? null;
    if (dto.deliveryFee !== undefined) out.deliveryFee = num(dto.deliveryFee) ?? null;
    if (dto.lowStockAlert !== undefined) out.lowStockAlert = num(dto.lowStockAlert) ?? undefined;
    if (dto.metaTitle !== undefined) out.metaTitle = dto.metaTitle || null;
    if (dto.metaDesc !== undefined) out.metaDesc = dto.metaDesc || null;
    return out;
  }

  async create(userId: string, dto: any) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!seller) throw new NotFoundException('Seller profile not found');

    // Plan-limit enforcement (M3a). Gated by `feature_subscriptions_enforced`
    // Setting — when off, `canSellerAddProduct` always returns allowed=true.
    const check = await this.subscriptions.canSellerAddProduct(seller.id);
    if (!check.allowed) {
      // 402 Payment Required = "your plan doesn't cover this; upgrade".
      // Structured payload so client can route to upgrade page.
      throw new HttpException(
        {
          code: 'PLAN_LIMIT',
          message: `Your ${check.planName} plan allows ${check.limit} products. You have ${check.used}. Upgrade to add more.`,
          limit: check.limit,
          used: check.used,
          planName: check.planName,
          upgradeUrl: '/seller/subscription',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const clean = this.sanitizeProductDto(dto);
    if (!clean.name) throw new BadRequestException('Product name is required');
    if (clean.basePrice == null) throw new BadRequestException('Product price is required');
    if (!clean.categoryId) throw new BadRequestException('Please choose a category');

    const slug = this.slugify(dto.name);
    return this.prisma.product.create({
      data: {
        ...clean,
        sellerId: seller.id,
        slug,
        status: ProductStatus.PENDING_REVIEW,
        variants: dto.variants ? { create: dto.variants } : undefined,
      } as any,
      include: { variants: true },
    });
  }

  // ── Update Product (Seller) ───────────────────────────────────────────────────
  async update(productId: string, sellerId: string, dto: any) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId },
    });
    if (!product) throw new ForbiddenException('Product not found or unauthorized');

    return this.prisma.product.update({
      where: { id: productId },
      data: { ...this.sanitizeProductDto(dto), status: ProductStatus.PENDING_REVIEW } as any,
    });
  }

  // ── Approve Product (Admin) ───────────────────────────────────────────────────
  async approve(productId: string) {
    return this.prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.APPROVED },
    });
  }

  async reject(productId: string, reason?: string) {
    return this.prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.REJECTED },
    });
  }

  // ── Admin: list ALL products (any status) ────────────────────────────────────
  async adminFindAll(query: { page?: number; limit?: number; search?: string; status?: string; categoryId?: string }) {
    const { page = 1, limit = 20, search, status, categoryId } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          seller: { select: { id: true, storeName: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } };
  }

  // ── Seller: list own products ──────────────────────────────────────────────────
  async findMySeller(userId: string, query: { page?: number; limit?: number; search?: string; status?: string }) {
    const { page = 1, limit = 20, search, status } = query;
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { sellerId: seller.id };
    if (status) where.status = status.toUpperCase();
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { id: true, name: true } }, _count: { select: { reviews: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } };
  }

  // ── Admin: get single product by UUID ─────────────────────────────────────────
  async adminFindOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        seller: { select: { id: true, storeName: true, storeSlug: true } },
        variants: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ── Admin: create product for any seller ─────────────────────────────────────
  async adminCreate(dto: any) {
    const { sellerId, variants, categoryId, ...rest } = dto;
    if (!sellerId) throw new BadRequestException('sellerId is required');

    const seller = await this.prisma.sellerProfile.findUnique({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Seller not found');

    // Only pass known Product scalar fields to Prisma
    const allowed = [
      'name','description','basePrice','comparePrice','cost',
      'discountType','discountValue','currency','sku','barcode','brand','condition','stock',
      'lowStockAlert','weight','dimensions','images','thumbnailUrl','videoUrl',
      'adVideoUrl','tags','isFeatured','isSponsored','metaTitle','metaDesc','deliveryFee',
    ];
    const data: any = {};
    for (const key of allowed) {
      if (rest[key] !== undefined) data[key] = rest[key];
    }
    // Allow unsetting per-product delivery fee (null = use default)
    if (data.deliveryFee !== undefined) {
      data.deliveryFee = data.deliveryFee === null || data.deliveryFee === '' ? null : Number(data.deliveryFee);
    }

    const slug = this.slugify(data.name || rest.name);
    const createData: any = {
      ...data,
      sellerId,
      slug,
      status: ProductStatus.APPROVED,
    };
    if (categoryId) createData.categoryId = categoryId;
    if (variants && variants.length) createData.variants = { create: variants };

    return this.prisma.product.create({
      data: createData,
      include: { variants: true, seller: { select: { storeName: true } } },
    });
  }

  // ── Admin: update any product (no seller ownership check) ────────────────────
  async adminUpdate(productId: string, dto: any) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    // Strip unknown fields — only pass valid Product scalars to Prisma
    const { variants, sellerId, categoryId, ...rest } = dto;
    const allowed = [
      'name','description','basePrice','comparePrice','cost',
      'discountType','discountValue','currency','sku','barcode','brand','condition','stock',
      'lowStockAlert','weight','dimensions','images','thumbnailUrl','videoUrl',
      'adVideoUrl','tags','isFeatured','isSponsored','metaTitle','metaDesc','status','deliveryFee',
    ];
    const data: any = {};
    for (const key of allowed) {
      if (rest[key] !== undefined) data[key] = rest[key];
    }
    // Allow unsetting per-product delivery fee (null = use default)
    if (data.deliveryFee !== undefined) {
      data.deliveryFee = data.deliveryFee === null || data.deliveryFee === '' ? null : Number(data.deliveryFee);
    }
    if (categoryId) data.categoryId = categoryId;

    return this.prisma.product.update({ where: { id: productId }, data });
  }

  // ── Admin: quick stock update ─────────────────────────────────────────────────
  async adminUpdateStock(productId: string, dto: { stock?: number; addStock?: number; lowStockAlert?: number }) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const data: any = {};
    if (dto.lowStockAlert !== undefined) data.lowStockAlert = dto.lowStockAlert;

    if (dto.addStock !== undefined && dto.addStock > 0) {
      // Increment stock by amount
      data.stock = { increment: dto.addStock };
    } else if (dto.stock !== undefined) {
      // Set stock to exact value
      data.stock = dto.stock;
    }

    return this.prisma.product.update({
      where: { id: productId },
      data,
      select: { id: true, name: true, stock: true, lowStockAlert: true },
    });
  }

  // ── Admin: delete product ─────────────────────────────────────────────────────
  async adminDelete(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    await this.prisma.product.delete({ where: { id: productId } });
    return { success: true };
  }

  // ── Related Products (same category, exclude self) ───────────────────────────
  async findRelated(slug: string, limit = 8) {
    const product = await this.prisma.product.findUnique({ where: { slug }, select: { id: true, categoryId: true, sellerId: true } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.product.findMany({
      where: { status: ProductStatus.APPROVED, categoryId: product.categoryId, id: { not: product.id } },
      take: limit,
      orderBy: { totalSold: 'desc' },
      include: {
        seller: { select: { id: true, storeName: true, storeSlug: true } },
        variants: true,
      },
    });
  }

  // ── Frequently Bought Together (top-sold products from same seller + same category bestsellers) ─
  async findFrequentlyBought(slug: string, limit = 4) {
    const product = await this.prisma.product.findUnique({ where: { slug }, select: { id: true, categoryId: true, sellerId: true } });
    if (!product) throw new NotFoundException('Product not found');
    // First: other top products from same seller
    const fromSeller = await this.prisma.product.findMany({
      where: { status: ProductStatus.APPROVED, sellerId: product.sellerId, id: { not: product.id } },
      take: limit,
      orderBy: { totalSold: 'desc' },
      include: { seller: { select: { storeName: true } } },
    });
    if (fromSeller.length >= limit) return fromSeller.slice(0, limit);
    // Backfill: bestsellers in same category
    const existing = new Set([product.id, ...fromSeller.map((p) => p.id)]);
    const backfill = await this.prisma.product.findMany({
      where: { status: ProductStatus.APPROVED, categoryId: product.categoryId, id: { notIn: [...existing] } },
      take: limit - fromSeller.length,
      orderBy: { totalSold: 'desc' },
      include: { seller: { select: { storeName: true } } },
    });
    return [...fromSeller, ...backfill];
  }

  // ── Get Featured / Flash Sale Products ───────────────────────────────────────
  async getFeatured() {
    return this.prisma.product.findMany({
      where: { status: ProductStatus.APPROVED, isFeatured: true },
      take: 20,
      include: { seller: { select: { storeName: true } }, variants: true },
    });
  }

  // ── Search Autocomplete (fuzzy via pg_trgm) ──────────────────────────────────
  async autocomplete(q: string) {
    const term = (q ?? '').trim();
    if (term.length < 2) {
      return this.prisma.product.findMany({
        where: { status: ProductStatus.APPROVED, name: { contains: term, mode: 'insensitive' } },
        take: 10,
        select: { id: true, name: true, slug: true, images: true, basePrice: true },
      });
    }

    // Trigram similarity + ILIKE fallback, ordered by best match
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, slug, images, "basePrice"
       FROM products
       WHERE status = 'APPROVED'
         AND (similarity(name, $1) > 0.15 OR name ILIKE '%' || $1 || '%')
       ORDER BY similarity(name, $1) DESC
       LIMIT 10`,
      term,
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      images: r.images,
      basePrice: r.basePrice,
    }));
  }

  // ── Generate AI Description ───────────────────────────────────────────────────
  async generateDescription(dto: {
    name: string;
    brand?: string;
    category?: string;
    tags?: string[];
    condition?: string;
  }): Promise<string> {
    const { name, brand, category, tags, condition } = dto;

    // Try OpenAI if key is available
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const prompt = [
          `Write a compelling, SEO-friendly product description for an e-commerce store.`,
          `Product: "${name}"`,
          brand ? `Brand: ${brand}` : '',
          category ? `Category: ${category}` : '',
          condition ? `Condition: ${condition}` : '',
          tags?.length ? `Tags/features: ${tags.join(', ')}` : '',
          `Requirements:`,
          `- 3-5 sentences, clear and informative`,
          `- Highlight key benefits and use cases`,
          `- Avoid excessive marketing fluff`,
          `- Plain text only, no markdown`,
        ].filter(Boolean).join('\n');

        const chat = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 250,
          temperature: 0.7,
        });
        const text = chat.choices[0]?.message?.content?.trim();
        if (text) return text;
      } catch {
        // fall through to template
      }
    }

    // Template-based fallback
    const brandStr = brand ? `by ${brand} ` : '';
    const catStr = category ? ` in the ${category} category` : '';
    const tagStr = tags?.length ? ` Featuring ${tags.slice(0, 4).join(', ')}.` : '';
    const condStr = condition && condition !== 'NEW' ? ` This ${condition.toLowerCase()} item` : ' This product';
    return (
      `${name} — a quality product ${brandStr}available${catStr}.` +
      `${condStr} is designed to meet your everyday needs with reliability and style.` +
      `${tagStr}` +
      ` Order now and enjoy fast delivery across Uganda.`
    );
  }

  private slugify(str: string): string {
    return (
      str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
      '-' +
      Date.now()
    );
  }
}
