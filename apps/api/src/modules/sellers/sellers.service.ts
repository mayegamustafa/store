import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SellerStatus } from '@prisma/client';

@Injectable()
export class SellersService {
  constructor(private prisma: PrismaService) {}

  async onboard(userId: string, dto: any) {
    const existing = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (existing) throw new ForbiddenException('Seller profile already exists');

    const slug = dto.storeName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    return this.prisma.sellerProfile.create({
      data: { userId, ...dto, storeSlug: slug, status: SellerStatus.PENDING },
    });
  }

  getMyProfile(userId: string) {
    return this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
    });
  }

  updateProfile(userId: string, dto: any) {
    return this.prisma.sellerProfile.update({ where: { userId }, data: dto });
  }

  /**
   * Daily revenue + order counts for the last N days — powers the seller
   * app's dashboard charts. Dense (zero-filled) series, ready to plot.
   */
  async getSalesTrend(userId: string, days = 14) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!seller) throw new NotFoundException('Seller profile not found');

    const span = Math.min(Math.max(Number(days) || 14, 1), 90);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (span - 1));

    const items = await this.prisma.orderItem.findMany({
      where: {
        sellerId: seller.id,
        order: { createdAt: { gte: since }, status: { not: 'CANCELLED' } },
      },
      select: {
        sellerEarning: true,
        subtotal: true,
        orderId: true,
        order: { select: { createdAt: true } },
      },
    });

    const key = (d: Date) => d.toISOString().slice(0, 10);
    const revenue = new Map<string, number>();
    const orderIds = new Map<string, Set<string>>();
    for (const it of items) {
      const k = key(it.order.createdAt);
      revenue.set(k, (revenue.get(k) ?? 0) + Number(it.sellerEarning ?? it.subtotal));
      if (!orderIds.has(k)) orderIds.set(k, new Set());
      orderIds.get(k)!.add(it.orderId);
    }

    const series: { date: string; revenue: number; orders: number }[] = [];
    for (let i = 0; i < span; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const k = key(d);
      series.push({
        date: k,
        revenue: revenue.get(k) ?? 0,
        orders: orderIds.get(k)?.size ?? 0,
      });
    }
    return {
      days: span,
      series,
      totalRevenue: series.reduce((a, b) => a + b.revenue, 0),
      totalOrders: series.reduce((a, b) => a + b.orders, 0),
    };
  }

  async getDashboard(userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalOrders, pendingOrders, totalRevenueAgg, monthRevenueAgg,
      activeProducts, pendingProducts, recentOrders] = await Promise.all([
      this.prisma.orderItem.count({ where: { sellerId: seller.id } }),
      this.prisma.orderItem.count({ where: { sellerId: seller.id, status: 'PENDING' } }),
      this.prisma.orderItem.aggregate({ where: { sellerId: seller.id, status: 'DELIVERED' }, _sum: { sellerEarning: true } }),
      this.prisma.orderItem.aggregate({ where: { sellerId: seller.id, status: 'DELIVERED', createdAt: { gte: startOfMonth } }, _sum: { sellerEarning: true } }),
      this.prisma.product.count({ where: { sellerId: seller.id, status: 'APPROVED' } }),
      this.prisma.product.count({ where: { sellerId: seller.id, status: { in: ['DRAFT', 'PENDING_REVIEW'] } } }),
      this.prisma.orderItem.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { product: { select: { name: true, images: true } }, order: { select: { createdAt: true } } },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      totalRevenue: totalRevenueAgg._sum.sellerEarning || 0,
      monthRevenue: monthRevenueAgg._sum.sellerEarning || 0,
      activeProducts,
      pendingProducts,
      avgRating: seller.rating || 0,
      totalReviews: seller.reviewCount,
      sellerStatus: seller.status,
      recentOrders,
    };
  }

  async getOrders(userId: string, page = 1, limit = 20, status?: string) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    const p = Math.max(1, +page || 1);
    const l = Math.max(1, Math.min(100, +limit || 20));
    const skip = (p - 1) * l;

    // Find distinct order IDs that contain items from this seller
    const itemWhere: any = { sellerId: seller.id };
    if (status) itemWhere.status = status;

    const orderIdsResult = await this.prisma.orderItem.findMany({
      where: itemWhere,
      select: { orderId: true },
      distinct: ['orderId'],
      orderBy: { createdAt: 'desc' },
    });

    const allOrderIds = orderIdsResult.map((i) => i.orderId);
    const total = allOrderIds.length;
    const pagedOrderIds = allOrderIds.slice(skip, skip + l);

    if (pagedOrderIds.length === 0) {
      return { data: [], total, page: p, totalPages: Math.ceil(total / l) };
    }

    // Fetch full orders for this page
    const orders = await this.prisma.order.findMany({
      where: { id: { in: pagedOrderIds } },
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { firstName: true, lastName: true, phone: true, email: true } },
        items: {
          where: { sellerId: seller.id },
          include: { product: { select: { name: true, images: true } } },
        },
        payment: { select: { status: true, method: true } },
        address: true,
      },
    });

    // Map to shape the seller frontend expects
    const data = orders.map((o: any) => ({
      ...o,
      user: {
        name: [o.buyer?.firstName, o.buyer?.lastName].filter(Boolean).join(' ') || '—',
        phone: o.buyer?.phone,
      },
      sellerEarning: o.items.reduce((sum: number, i: any) => sum + Number(i.sellerEarning || 0), 0),
    }));

    return { data, total, page: p, totalPages: Math.ceil(total / l) };
  }

  async getEarnings(userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');

    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const startOfWeek  = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); startOfWeek.setHours(0, 0, 0, 0);

    const [total, thisMonth, thisWeek, pending] = await Promise.all([
      this.prisma.orderItem.aggregate({ where: { sellerId: seller.id, status: 'DELIVERED' }, _sum: { sellerEarning: true } }),
      this.prisma.orderItem.aggregate({ where: { sellerId: seller.id, status: 'DELIVERED', createdAt: { gte: startOfMonth } }, _sum: { sellerEarning: true } }),
      this.prisma.orderItem.aggregate({ where: { sellerId: seller.id, status: 'DELIVERED', createdAt: { gte: startOfWeek  } }, _sum: { sellerEarning: true } }),
      this.prisma.orderItem.aggregate({ where: { sellerId: seller.id, status: { in: ['PENDING','CONFIRMED','PROCESSING','SHIPPED'] } }, _sum: { sellerEarning: true } }),
    ]);
    return {
      totalEarnings: total._sum.sellerEarning    || 0,
      totalEarned:   total._sum.sellerEarning    || 0,      // alias for finance page
      availableBalance: thisMonth._sum.sellerEarning || 0,  // approximation — month earnings
      monthEarnings: thisMonth._sum.sellerEarning || 0,
      weekEarnings:  thisWeek._sum.sellerEarning  || 0,
      pendingEarnings: pending._sum.sellerEarning || 0,
      pendingBalance:  pending._sum.sellerEarning || 0,     // alias for finance page
    };
  }

  async requestPayout(userId: string, amount: number, method: string, accountNumber: string) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    // Store payout request as a notification (simple approach until payout table exists)
    await this.prisma.notification.create({
      data: {
        userId,
        title: 'Payout Request Received',
        body: `Your payout request of UGX ${amount.toLocaleString()} via ${method} to ${accountNumber} is being processed.`,
        type: 'SYSTEM',
      },
    });
    return { success: true, message: 'Payout request submitted. We will process it within 2-3 business days.' };
  }

  // Admin: approve/reject seller
  async approveSeller(sellerId: string) {
    return this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: { status: SellerStatus.APPROVED, approvedAt: new Date() },
    });
  }

  async rejectSeller(sellerId: string, reason: string) {
    return this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: { status: SellerStatus.REJECTED, rejectedAt: new Date(), rejectionReason: reason },
    });
  }

  async markOfficial(sellerId: string, isOfficial: boolean) {
    if (isOfficial) {
      await this.prisma.sellerProfile.updateMany({
        where: { isOfficial: true },
        data: { isOfficial: false },
      });
    }
    return this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: { isOfficial },
      include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
    });
  }

  suspendSeller(sellerId: string) {
    return this.prisma.sellerProfile.update({ where: { id: sellerId }, data: { status: SellerStatus.SUSPENDED } });
  }

  unsuspendSeller(sellerId: string) {
    return this.prisma.sellerProfile.update({ where: { id: sellerId }, data: { status: SellerStatus.APPROVED } });
  }

  async getAllSellers(status?: SellerStatus, page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { storeName: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName:  { contains: search, mode: 'insensitive' } } },
        { user: { email:     { contains: search, mode: 'insensitive' } } },
        { user: { phone:     { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.sellerProfile.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          _count: { select: { products: true } },
        },
        orderBy: [{ isOfficial: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.sellerProfile.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
