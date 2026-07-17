import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DeliveryStatus, OrderStatus, RiderStatus, Role } from '@prisma/client';
import { WalletService } from '../wallet/wallet.service';
import * as bcrypt from 'bcryptjs';

type RiderListFilters = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
};

@Injectable()
export class RidersService {
  private readonly logger = new Logger(RidersService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  async register(userId: string, dto: any) {
    return this.prisma.riderProfile.create({ data: { userId, ...dto, status: RiderStatus.PENDING } });
  }

  private normalizeRequestedStatus(status?: string): RiderStatus | undefined {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
      case 'ACTIVE':
        return RiderStatus.ACTIVE;
      case 'REJECTED':
      case 'INACTIVE':
        return RiderStatus.INACTIVE;
      case 'SUSPENDED':
        return RiderStatus.SUSPENDED;
      case 'PENDING':
        return RiderStatus.PENDING;
      default:
        return undefined;
    }
  }

  private toAdminStatus(status: RiderStatus): string {
    switch (status) {
      case RiderStatus.ACTIVE:
        return 'APPROVED';
      case RiderStatus.INACTIVE:
        return 'REJECTED';
      default:
        return status;
    }
  }

  private serializeRider(rider: any) {
    const firstName = rider.user?.firstName ?? '';
    const lastName = rider.user?.lastName ?? '';

    return {
      ...rider,
      rawStatus: rider.status,
      status: this.toAdminStatus(rider.status),
      totalTrips: rider.totalDeliveries,
      user: rider.user
        ? {
            ...rider.user,
            name: [firstName, lastName].filter(Boolean).join(' ').trim(),
          }
        : null,
    };
  }

  private orderStatusForDelivery(status: DeliveryStatus): OrderStatus {
    switch (status) {
      case DeliveryStatus.ASSIGNED:
        return OrderStatus.SHIPPED;
      case DeliveryStatus.PICKED_UP:
      case DeliveryStatus.IN_TRANSIT:
        return OrderStatus.OUT_FOR_DELIVERY;
      case DeliveryStatus.DELIVERED:
        return OrderStatus.DELIVERED;
      case DeliveryStatus.FAILED:
        return OrderStatus.CANCELLED;
    }
  }

  getMyProfile(userId: string) {
    return this.prisma.riderProfile.findUnique({
      where: { userId },
      include: { user: { select: { firstName: true, lastName: true, phone: true } } },
    });
  }

  async setOnlineStatus(userId: string, isOnline: boolean) {
    return this.prisma.riderProfile.update({ where: { userId }, data: { isOnline } });
  }

  async getAssignedDeliveries(userId: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { userId } });
    if (!rider) return [];
    return this.prisma.delivery.findMany({
      where: { riderId: rider.id, status: { notIn: ['DELIVERED', 'FAILED'] } },
      include: {
        order: {
          include: {
            buyer: { select: { id: true, firstName: true, lastName: true, phone: true } },
            address: true,
            items: { include: { product: { select: { name: true, images: true } } } },
          },
        },
      },
    });
  }

  async updateDeliveryStatus(deliveryId: string, userId: string, dto: any) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { userId } });
    if (!rider) throw new NotFoundException('Rider profile not found');

    const status = dto.status as DeliveryStatus;
    if (!status) throw new BadRequestException('status is required');

    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, riderId: rider.id },
      include: { order: true },
    });
    if (!delivery) throw new NotFoundException('Delivery not found');

    const latitude = dto.latitude ?? dto.lat;
    const longitude = dto.longitude ?? dto.lng;
    const statusChanged = delivery.status !== status;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (latitude != null && longitude != null) {
        await tx.riderProfile.update({
          where: { id: rider.id },
          data: {
            currentLat: Number(latitude),
            currentLng: Number(longitude),
            lastLocationAt: new Date(),
          },
        });

        await tx.riderLocationLog.create({
          data: {
            riderId: rider.id,
            lat: Number(latitude),
            lng: Number(longitude),
            speed: dto.speed != null ? Number(dto.speed) : undefined,
            heading: dto.heading != null ? Number(dto.heading) : undefined,
          },
        });
      }

      const nextDelivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status,
          actualPickupAt: status === DeliveryStatus.PICKED_UP && !delivery.actualPickupAt ? new Date() : delivery.actualPickupAt,
          deliveredAt: status === DeliveryStatus.DELIVERED ? new Date() : delivery.deliveredAt,
          failedAt: status === DeliveryStatus.FAILED ? new Date() : delivery.failedAt,
          failReason: status === DeliveryStatus.FAILED ? dto.note ?? dto.failReason ?? delivery.failReason : delivery.failReason,
          proofPhoto: dto.proof ?? delivery.proofPhoto,
        },
        include: {
          order: {
            include: {
              buyer: { select: { firstName: true, lastName: true, phone: true } },
              address: true,
              items: { include: { product: { select: { name: true, images: true } } } },
            },
          },
        },
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: { status: this.orderStatusForDelivery(status) },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: delivery.orderId,
          status: this.orderStatusForDelivery(status),
          note: dto.note ?? `Delivery status updated to ${status}`,
          updatedBy: userId,
        },
      });

      if (statusChanged || dto.note || dto.proof || latitude != null || longitude != null) {
        await tx.deliveryStatusLog.create({
          data: {
            deliveryId,
            status,
            note: dto.note,
            proofPhoto: dto.proof,
            latitude: latitude != null ? Number(latitude) : undefined,
            longitude: longitude != null ? Number(longitude) : undefined,
            updatedById: userId,
          },
        });
      }

      if (status === DeliveryStatus.DELIVERED && delivery.status !== DeliveryStatus.DELIVERED) {
        await tx.riderProfile.update({
          where: { id: rider.id },
          data: { totalDeliveries: { increment: 1 } },
        });

        // Mark all order items as DELIVERED so seller/admin revenue reports work
        await tx.orderItem.updateMany({
          where: { orderId: delivery.orderId },
          data: { status: OrderStatus.DELIVERED },
        });
      }

      return nextDelivery;
    });

    // Credit rider wallet on delivery completion
    if (status === DeliveryStatus.DELIVERED && delivery.status !== DeliveryStatus.DELIVERED) {
      const earning = Number(delivery.riderEarning) || Number(delivery.order?.shippingFee) || 0;
      if (earning > 0) {
        await this.walletService.creditRider(
          rider.id,
          earning,
          `Delivery earning for order ${delivery.order?.orderNumber || delivery.orderId}`,
          delivery.id,
        ).catch((err) => this.logger.error(`Failed to credit rider ${rider.id}: ${err.message}`));
        this.logger.log(`Credited rider ${rider.id} with ${earning} for delivery ${deliveryId}`);
      }
    }

    return updated;
  }

  /**
   * Daily earnings + delivery counts for the last N days — powers the rider
   * app's analytics charts. Returns a dense series (zero-filled) so the
   * client can plot it directly.
   */
  async getEarningsTrend(userId: string, days = 14) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!rider) throw new NotFoundException('Rider profile not found');

    const span = Math.min(Math.max(Number(days) || 14, 1), 90);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (span - 1));

    const [txns, deliveries] = await Promise.all([
      this.prisma.riderWalletTransaction.findMany({
        where: { riderId: rider.id, type: 'credit', createdAt: { gte: since } },
        select: { amount: true, createdAt: true },
      }),
      this.prisma.delivery.findMany({
        where: { riderId: rider.id, status: 'DELIVERED', updatedAt: { gte: since } },
        select: { updatedAt: true },
      }),
    ]);

    const key = (d: Date) => d.toISOString().slice(0, 10);
    const earned = new Map<string, number>();
    const count = new Map<string, number>();
    for (const t of txns) {
      const k = key(t.createdAt);
      earned.set(k, (earned.get(k) ?? 0) + Number(t.amount));
    }
    for (const d of deliveries) {
      const k = key(d.updatedAt);
      count.set(k, (count.get(k) ?? 0) + 1);
    }

    const series: { date: string; earnings: number; deliveries: number }[] = [];
    for (let i = 0; i < span; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const k = key(d);
      series.push({ date: k, earnings: earned.get(k) ?? 0, deliveries: count.get(k) ?? 0 });
    }
    return {
      days: span,
      series,
      totalEarnings: series.reduce((a, b) => a + b.earnings, 0),
      totalDeliveries: series.reduce((a, b) => a + b.deliveries, 0),
    };
  }

  async getEarnings(userId: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { userId } });
    if (!rider) throw new NotFoundException('Rider profile not found');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalAgg, todayAgg, weekAgg, monthAgg, completedDeliveries] = await Promise.all([
      this.prisma.riderWalletTransaction.aggregate({
        where: { riderId: rider.id, type: 'credit' },
        _sum: { amount: true },
      }),
      this.prisma.riderWalletTransaction.aggregate({
        where: { riderId: rider.id, type: 'credit', createdAt: { gte: startOfToday } },
        _sum: { amount: true },
      }),
      this.prisma.riderWalletTransaction.aggregate({
        where: { riderId: rider.id, type: 'credit', createdAt: { gte: startOfWeek } },
        _sum: { amount: true },
      }),
      this.prisma.riderWalletTransaction.aggregate({
        where: { riderId: rider.id, type: 'credit', createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.delivery.count({ where: { riderId: rider.id, status: 'DELIVERED' } }),
    ]);

    return {
      walletBalance: rider.walletBalance ?? 0,
      total: totalAgg._sum.amount ?? 0,
      today: todayAgg._sum.amount ?? 0,
      week: weekAgg._sum.amount ?? 0,
      month: monthAgg._sum.amount ?? 0,
      completedDeliveries,
      totalDeliveries: rider.totalDeliveries ?? 0,
      rating: rider.rating ?? 0,
    };
  }

  async updateLocation(userId: string, dto: any) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { userId } });
    if (!rider) throw new NotFoundException('Rider profile not found');

    const latitude = Number(dto.latitude ?? dto.lat);
    const longitude = Number(dto.longitude ?? dto.lng);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      throw new BadRequestException('latitude and longitude are required');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.riderProfile.update({
        where: { id: rider.id },
        data: {
          currentLat: latitude,
          currentLng: longitude,
          lastLocationAt: new Date(),
          isOnline: dto.isOnline ?? rider.isOnline,
        },
      });

      await tx.riderLocationLog.create({
        data: {
          riderId: rider.id,
          lat: latitude,
          lng: longitude,
          speed: dto.speed != null ? Number(dto.speed) : undefined,
          heading: dto.heading != null ? Number(dto.heading) : undefined,
        },
      });

      if (dto.deliveryId) {
        await tx.deliveryStatusLog.create({
          data: {
            deliveryId: dto.deliveryId,
            status: DeliveryStatus.IN_TRANSIT,
            note: dto.note ?? 'Location update',
            latitude,
            longitude,
            updatedById: userId,
          },
        });
      }
    });

    return {
      success: true,
      riderId: rider.id,
      latitude,
      longitude,
      updatedAt: new Date().toISOString(),
    };
  }

  // Admin
  approveRider(riderId: string) {
    return this.prisma.riderProfile.update({ where: { id: riderId }, data: { status: RiderStatus.ACTIVE } });
  }

  rejectRider(riderId: string, reason?: string) {
    return this.prisma.riderProfile.update({ where: { id: riderId }, data: { status: RiderStatus.INACTIVE } });
  }

  suspendRider(riderId: string) {
    return this.prisma.riderProfile.update({ where: { id: riderId }, data: { status: RiderStatus.SUSPENDED } });
  }

  unsuspendRider(riderId: string) {
    return this.prisma.riderProfile.update({ where: { id: riderId }, data: { status: RiderStatus.ACTIVE } });
  }

  async getAllRiders(filters: RiderListFilters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;
    const where: any = {};
    const normalizedStatus = this.normalizeRequestedStatus(filters.status);

    if (normalizedStatus) {
      where.status = normalizedStatus;
    }

    if (filters.search) {
      where.OR = [
        { vehicleType: { contains: filters.search, mode: 'insensitive' } },
        { vehiclePlate: { contains: filters.search, mode: 'insensitive' } },
        { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        { user: { phone: { contains: filters.search, mode: 'insensitive' } } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.riderProfile.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true, phone: true, email: true } } },
        orderBy: [{ isOnline: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.riderProfile.count({ where }),
    ]);

    return {
      data: data.map((rider) => this.serializeRider(rider)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getRiderById(riderId: string) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { id: riderId },
      include: {
        user: { select: { firstName: true, lastName: true, phone: true, email: true } },
        deliveries: {
          take: 10,
          orderBy: { updatedAt: 'desc' },
          include: { order: { select: { id: true, orderNumber: true, status: true, total: true } } },
        },
      },
    });

    if (!rider) throw new NotFoundException('Rider not found');
    return this.serializeRider(rider);
  }

  async updateRiderStatus(riderId: string, status: string) {
    const normalizedStatus = this.normalizeRequestedStatus(status);
    if (!normalizedStatus) throw new BadRequestException('Unsupported rider status');

    const rider = await this.prisma.riderProfile.update({
      where: { id: riderId },
      data: { status: normalizedStatus },
      include: { user: { select: { firstName: true, lastName: true, phone: true, email: true } } },
    });

    return this.serializeRider(rider);
  }

  async adminCreateRider(dto: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    password: string;
    vehicleType?: string;
    vehiclePlate?: string;
    zone?: string;
  }) {
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: dto.email || undefined,
        password: hashedPassword,
        role: Role.RIDER,
        isEmailVerified: true,
        status: 'ACTIVE',
      },
    });
    const rider = await this.prisma.riderProfile.create({
      data: {
        user: { connect: { id: user.id } },
        vehicleType: dto.vehicleType,
        vehiclePlate: dto.vehiclePlate,
        status: RiderStatus.ACTIVE,
      },
      include: { user: { select: { firstName: true, lastName: true, phone: true, email: true } } },
    });
    return rider;
  }
}
