import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReelsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, search?: string, sellerId?: string) {
    const take = 20;
    const skip = (page - 1) * take;
    const where: any = { isActive: true };
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (sellerId) where.sellerId = sellerId;
    const [items, total] = await Promise.all([
      this.prisma.reel.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { seller: { select: { storeName: true, storeLogo: true, storeSlug: true } } } }),
      this.prisma.reel.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / take) };
  }

  async findOne(id: string) {
    const reel = await this.prisma.reel.findUnique({ where: { id }, include: { seller: { select: { storeName: true, storeLogo: true } } } });
    if (!reel) throw new NotFoundException('Reel not found');
    await this.prisma.reel.update({ where: { id }, data: { views: { increment: 1 } } });
    return reel;
  }

  async create(data: any) {
    return this.prisma.reel.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.reel.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.reel.delete({ where: { id } });
  }

  async like(id: string) {
    return this.prisma.reel.update({ where: { id }, data: { likes: { increment: 1 } } });
  }

  async adminFindAll(page = 1, search?: string) {
    const take = 20;
    const skip = (page - 1) * take;
    const where: any = {};
    if (search) where.title = { contains: search, mode: 'insensitive' };
    const [items, total] = await Promise.all([
      this.prisma.reel.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { seller: { select: { storeName: true, storeLogo: true } } } }),
      this.prisma.reel.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / take) };
  }
}
