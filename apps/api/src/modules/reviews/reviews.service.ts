import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(userId: string, productId: string, dto: { rating: number; title?: string; body?: string; images?: string[] }) {
    // Verify purchase
    const purchased = await this.prisma.orderItem.findFirst({
      where: { productId, order: { buyerId: userId, status: 'DELIVERED' } },
    });
    if (!purchased) throw new BadRequestException('You can only review purchased products');

    const review = await this.prisma.review.create({
      data: { userId, productId, isVerified: true, ...dto },
    });

    // Update product rating
    const stats = await this.prisma.review.aggregate({ where: { productId }, _avg: { rating: true }, _count: { id: true } });
    await this.prisma.product.update({
      where: { id: productId },
      data: { rating: stats._avg.rating || 0, reviewCount: stats._count.id },
    });

    return review;
  }

  getProductReviews(productId: string, page = 1, limit = 20) {
    const take = Math.min(Math.max(1, limit), 50);
    const skip = (Math.max(1, page) - 1) * take;
    return this.prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
    });
  }
}
