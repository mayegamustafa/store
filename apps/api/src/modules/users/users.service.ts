import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, phone: true, firstName: true, lastName: true,
        avatar: true, role: true, status: true, loyaltyPoints: true,
        walletBalance: true, isEmailVerified: true, isPhoneVerified: true,
        createdAt: true,
      },
    });
  }

  updateProfile(id: string, dto: any) {
    const data: any = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName  !== undefined) data.lastName  = dto.lastName;
    if (dto.avatar    !== undefined) data.avatar    = dto.avatar;
    // treat empty string as null to avoid @unique constraint violation
    if (dto.phone !== undefined) data.phone = dto.phone === '' ? null : dto.phone;
    return this.prisma.user.update({ where: { id }, data });
  }

  addAddress(userId: string, dto: any) {
    return this.prisma.address.create({ data: { userId, ...dto } });
  }

  getAddresses(userId: string) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
  }

  async updateAddress(id: string, userId: string, dto: any) {
    const addr = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!addr) throw new NotFoundException('Address not found');
    return this.prisma.address.update({ where: { id }, data: dto });
  }

  async setDefaultAddress(id: string, userId: string) {
    await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return this.prisma.address.update({ where: { id }, data: { isDefault: true } });
  }

  getWishlist(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: { select: { id: true, name: true, slug: true, images: true, basePrice: true, comparePrice: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addToWishlist(userId: string, productId: string) {
    const existing = await this.prisma.wishlistItem.findFirst({ where: { userId, productId } });
    if (existing) return existing;
    return this.prisma.wishlistItem.create({ data: { userId, productId } });
  }

  removeFromWishlist(userId: string, productId: string) {
    return this.prisma.wishlistItem.deleteMany({ where: { userId, productId } });
  }

  deleteAddress(id: string, userId: string) {
    return this.prisma.address.deleteMany({ where: { id, userId } });
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  async adminListUsers(page = 1, limit = 20, search?: string, status?: string) {
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [total, data] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where, skip, take: Number(limit),
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, status: true, createdAt: true, loyaltyPoints: true, walletBalance: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit) } };
  }

  adminSuspendUser(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { status: UserStatus.SUSPENDED } });
  }

  adminUnsuspendUser(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { status: UserStatus.ACTIVE } });
  }

  adminDeleteUser(userId: string) {
    return this.prisma.user.delete({ where: { id: userId } });
  }

  // ── Notifications ────────────────────────────────────────────────────────
  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (Number(page) - 1) * Number(limit);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
    ]);
    const unreadCount = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { data, meta: { total, page: Number(page), limit: Number(limit), unreadCount } };
  }

  async markNotificationRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllNotificationsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
