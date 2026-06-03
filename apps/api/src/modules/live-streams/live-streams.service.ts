import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function rtmpKey() {
  return require('crypto').randomBytes(16).toString('hex');
}

@Injectable()
export class LiveStreamsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, status?: string, sellerId?: string) {
    const take = 20;
    const skip = (page - 1) * take;
    const where: any = {};
    if (status) where.status = status;
    if (sellerId) where.sellerId = sellerId;
    const [items, total] = await Promise.all([
      this.prisma.liveStream.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { seller: { select: { storeName: true, storeLogo: true, storeSlug: true } } } }),
      this.prisma.liveStream.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / take) };
  }

  async findOne(id: string) {
    const stream = await this.prisma.liveStream.findUnique({ where: { id }, include: { seller: { select: { storeName: true, storeLogo: true } } } });
    if (!stream) throw new NotFoundException('Stream not found');
    if (stream.status === 'LIVE') {
      await this.prisma.liveStream.update({ where: { id }, data: { viewerCount: { increment: 1 } } });
    }
    return stream;
  }

  async create(user: any, data: any) {
    let sellerId = data.sellerId || null;
    // If a seller is creating, resolve their profile
    if (!sellerId && user?.role === 'SELLER') {
      const seller = await this.prisma.sellerProfile.findUnique({ where: { userId: user.id } });
      if (seller) sellerId = seller.id;
    }
    const { sellerId: _omit, ...rest } = data;
    return this.prisma.liveStream.create({
      data: { ...rest, sellerId, rtmpKey: rtmpKey() },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.liveStream.update({ where: { id }, data });
  }

  async startStream(id: string) {
    return this.prisma.liveStream.update({ where: { id }, data: { status: 'LIVE', startedAt: new Date() } });
  }

  async endStream(id: string) {
    return this.prisma.liveStream.update({ where: { id }, data: { status: 'ENDED', endedAt: new Date(), viewerCount: 0 } });
  }

  async remove(id: string) {
    return this.prisma.liveStream.delete({ where: { id } });
  }

  async adminFindAll(page = 1, search?: string, status?: string) {
    const take = 20;
    const skip = (page - 1) * take;
    const where: any = {};
    if (status) where.status = status;
    if (search) where.title = { contains: search, mode: 'insensitive' };
    const [items, total] = await Promise.all([
      this.prisma.liveStream.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { seller: { select: { storeName: true, storeLogo: true } } } }),
      this.prisma.liveStream.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / take) };
  }
}
