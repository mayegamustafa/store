import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FlashSalesService {
  constructor(private prisma: PrismaService) {}

  getActive() {
    const now = new Date();
    return this.prisma.flashSale.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      include: { items: { include: { product: { select: {
        id: true, name: true, slug: true, images: true,
        basePrice: true, comparePrice: true, rating: true, totalSold: true,
        seller: { select: { storeName: true } },
      } } } } },
    });
  }

  create(dto: any) { return this.prisma.flashSale.create({ data: dto }); }
  update(id: string, dto: any) { return this.prisma.flashSale.update({ where: { id }, data: dto }); }
  delete(id: string) { return this.prisma.flashSale.delete({ where: { id } }); }
}
