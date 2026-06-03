import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const today = new Date(new Date().setHours(0, 0, 0, 0));

    const [
      totalOrders, activeSellers, pendingSellers, totalBuyers, activeRiders,
      totalRevenueTx, revenueTodayTx, pendingOrders, ordersToday, deliveredToday,
      totalProducts, pendingProducts, newBuyersToday,
      ordersByStatusRaw, paidPendingDelivery, processingOrders, recentOrdersRaw,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.sellerProfile.count({ where: { status: 'APPROVED' } }),
      this.prisma.sellerProfile.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count({ where: { role: 'BUYER' } }),
      this.prisma.riderProfile.count({ where: { status: 'ACTIVE' } }),
      this.prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'COMPLETED', confirmedAt: { gte: today } }, _sum: { amount: true } }),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.count({ where: { status: 'DELIVERED', updatedAt: { gte: today } } }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: 'PENDING_REVIEW' } }),
      this.prisma.user.count({ where: { role: 'BUYER', createdAt: { gte: today } } }),
      this.prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
      // Paid but not yet delivered
      this.prisma.order.count({
        where: { paymentStatus: 'COMPLETED', status: { notIn: ['DELIVERED', 'CANCELLED'] } },
      }),
      // Processing orders
      this.prisma.order.count({ where: { status: 'PROCESSING' } }),
      // Recent orders (last 10)
      this.prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          payment: { select: { status: true, method: true } },
        },
      }),
    ]);

    // Build ordersByStatus map
    const ordersByStatus: Record<string, number> = {};
    for (const row of ordersByStatusRaw) {
      ordersByStatus[row.status] = row._count.id;
    }

    // Map recent orders for frontend
    const recentOrders = recentOrdersRaw.map((o: any) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      total: o.total,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
      user: {
        name: [o.buyer?.firstName, o.buyer?.lastName].filter(Boolean).join(' ') || o.buyer?.email || '—',
        phone: o.buyer?.phone,
      },
    }));

    // Build revenueByMonth (last 6 months)
    const revenueByMonth: { month: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const agg = await this.prisma.payment.aggregate({
        where: { status: 'COMPLETED', confirmedAt: { gte: start, lte: end } },
        _sum: { amount: true },
      });
      revenueByMonth.push({
        month: start.toLocaleString('en', { month: 'short' }),
        revenue: Number(agg._sum.amount || 0),
      });
    }

    return {
      totalOrders,
      ordersToday,
      totalRevenue: Number(totalRevenueTx._sum.amount || 0),
      revenueToday: Number(revenueTodayTx._sum.amount || 0),
      activeSellers,
      pendingSellers,
      totalBuyers,
      newBuyersToday,
      totalProducts,
      pendingProducts,
      activeRiders,
      pendingOrders,
      deliveredToday,
      paidPendingDelivery,
      processingOrders,
      ordersByStatus,
      revenueByMonth,
      recentOrders,
    };
  }

  async getAllOrders(page = 1, limit = 20, status?: string) {
    const p = Math.max(1, +page || 1);
    const l = Math.max(1, Math.min(100, +limit || 20));
    const skip = (p - 1) * l;
    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          items: { select: { productName: true, quantity: true, subtotal: true, sellerId: true } },
          payment: { select: { status: true, method: true, providerRef: true, confirmedAt: true } },
          delivery: { select: { status: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    // Map to shape expected by admin frontend
    const orders = data.map((o: any) => ({
      ...o,
      user: {
        name: [o.buyer?.firstName, o.buyer?.lastName].filter(Boolean).join(' ') || o.buyer?.email || '—',
        phone: o.buyer?.phone,
        email: o.buyer?.email,
      },
    }));

    return { data: orders, total, page: p, limit: l, totalPages: Math.ceil(total / l) };
  }

  getRevenueReport(from: Date, to: Date) {
    return this.prisma.payment.groupBy({
      by: ['method'],
      where: { status: 'COMPLETED', createdAt: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: { id: true },
    });
  }

  getTopSellingProducts(limit = 10) {
    return this.prisma.product.findMany({
      where: { status: 'APPROVED' },
      orderBy: { totalSold: 'desc' },
      take: limit,
      select: { id: true, name: true, images: true, totalSold: true, seller: { select: { storeName: true } } },
    });
  }

  manageBanners() {
    return this.prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  getPublicHeroBanners() {
    const now = new Date();
    return this.prisma.banner.findMany({
      where: {
        placement: 'home_hero',
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  createBanner(dto: any) {
    const { imageUrl, link, ...rest } = dto;
    return this.prisma.banner.create({
      data: {
        title: rest.title || 'New Slide',
        image: imageUrl || rest.image || '',
        subtitle: rest.subtitle,
        badgeText: rest.badgeText,
        buttonText: rest.buttonText,
        buttonUrl: rest.buttonUrl,
        button2Text: rest.button2Text,
        button2Url: rest.button2Url,
        bgColor: rest.bgColor,
        textAlign: rest.textAlign || 'center',
        targetUrl: link || rest.targetUrl || undefined,
        placement: rest.placement || 'home_hero',
        isActive: rest.isActive ?? true,
        sortOrder: rest.sortOrder ?? 0,
        startsAt: rest.startsAt ? new Date(rest.startsAt) : undefined,
        endsAt: rest.endsAt ? new Date(rest.endsAt) : undefined,
      },
    });
  }

  updateBanner(id: string, dto: any) {
    const { imageUrl, link, ...rest } = dto;
    return this.prisma.banner.update({
      where: { id },
      data: {
        ...(rest.title !== undefined ? { title: rest.title } : {}),
        ...(imageUrl !== undefined ? { image: imageUrl } : rest.image !== undefined ? { image: rest.image } : {}),
        ...(rest.subtitle !== undefined ? { subtitle: rest.subtitle } : {}),
        ...(rest.badgeText !== undefined ? { badgeText: rest.badgeText } : {}),
        ...(rest.buttonText !== undefined ? { buttonText: rest.buttonText } : {}),
        ...(rest.buttonUrl !== undefined ? { buttonUrl: rest.buttonUrl } : {}),
        ...(rest.button2Text !== undefined ? { button2Text: rest.button2Text } : {}),
        ...(rest.button2Url !== undefined ? { button2Url: rest.button2Url } : {}),
        ...(rest.bgColor !== undefined ? { bgColor: rest.bgColor } : {}),
        ...(rest.textAlign !== undefined ? { textAlign: rest.textAlign } : {}),
        ...(link !== undefined ? { targetUrl: link || undefined } : rest.targetUrl !== undefined ? { targetUrl: rest.targetUrl || undefined } : {}),
        ...(rest.placement !== undefined ? { placement: rest.placement } : {}),
        ...(rest.isActive !== undefined ? { isActive: rest.isActive } : {}),
        ...(rest.sortOrder !== undefined ? { sortOrder: rest.sortOrder } : {}),
        ...(rest.startsAt !== undefined ? { startsAt: rest.startsAt ? new Date(rest.startsAt) : null } : {}),
        ...(rest.endsAt !== undefined ? { endsAt: rest.endsAt ? new Date(rest.endsAt) : null } : {}),
      },
    });
  }

  deleteBanner(id: string) {
    return this.prisma.banner.delete({ where: { id } });
  }

  getSettings() {
    return this.prisma.setting.findMany();
  }

  upsertSetting(key: string, value: string) {
    return this.prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  async bulkUpsertSettings(settings: { key: string; value: string }[]) {
    if (!settings?.length) return [];
    const ops = settings.map((s) =>
      this.prisma.setting.upsert({ where: { key: s.key }, create: { key: s.key, value: s.value }, update: { value: s.value } })
    );
    return this.prisma.$transaction(ops);
  }

  // ── Manual seller creation ─────────────────────────────────────────────────
  async createSellerManually(dto: {
    name: string; email?: string; phone?: string; password: string;
    storeName: string; description?: string; whatsapp?: string;
  }) {
    const hashed = await bcrypt.hash(dto.password, 12);
    const parts = dto.name.trim().split(' ');
    const firstName = parts[0] ?? dto.name;
    const lastName = parts.slice(1).join(' ') || '-';
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          email: dto.email || undefined,
          phone: dto.phone || undefined,
          password: hashed,
          role: Role.SELLER,
          isEmailVerified: true,
        },
      });
      const seller = await tx.sellerProfile.create({
        data: {
          userId: user.id,
          storeName: dto.storeName,
          storeSlug: dto.storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          storeDescription: dto.description,
          status: 'APPROVED',
        },
      });
      return { user: { id: user.id, name: `${user.firstName} ${user.lastName}`, email: user.email, phone: user.phone }, seller };
    });
  }

  // ── Brands ─────────────────────────────────────────────────────────────────
  manageBrands() {
    return this.prisma.brand.findMany({ orderBy: { sortOrder: 'asc' } });
  }
  createBrand(dto: any) {
    return this.prisma.brand.create({ data: dto });
  }
  updateBrand(id: string, dto: any) {
    return this.prisma.brand.update({ where: { id }, data: dto });
  }
  deleteBrand(id: string) {
    return this.prisma.brand.delete({ where: { id } });
  }

  // ── Home Blocks ────────────────────────────────────────────────────────────
  manageHomeBlocks() {
    return this.prisma.homeBlock.findMany({ orderBy: { sortOrder: 'asc' } });
  }
  createHomeBlock(dto: any) {
    return this.prisma.homeBlock.create({ data: dto });
  }
  updateHomeBlock(id: string, dto: any) {
    return this.prisma.homeBlock.update({ where: { id }, data: dto });
  }
  deleteHomeBlock(id: string) {
    return this.prisma.homeBlock.delete({ where: { id } });
  }

  // ── User notification inbox ────────────────────────────────────────────────
  getUserInboxNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });
  }

  getUserUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  markNotificationRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  markAllNotificationsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
