import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  create(dto: any) { return this.prisma.coupon.create({ data: dto }); }
  findAll() { return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }); }
  findOne(id: string) { return this.prisma.coupon.findUnique({ where: { id } }); }
  update(id: string, dto: any) { return this.prisma.coupon.update({ where: { id }, data: dto }); }
  delete(id: string) { return this.prisma.coupon.delete({ where: { id } }); }

  async validate(code: string, orderTotal: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid coupon');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new BadRequestException('Coupon expired');
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) throw new BadRequestException('Coupon limit reached');
    if (coupon.minOrderAmount && orderTotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(`Minimum order amount is ${coupon.minOrderAmount}`);
    }
    return coupon;
  }
}
