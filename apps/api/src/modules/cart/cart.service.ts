import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, images: true, basePrice: true, stock: true, sellerId: true, seller: { select: { storeName: true } } } },
            variant: true,
          },
        },
      },
    });
    return cart || await this.prisma.cart.create({ data: { userId }, include: { items: true } });
  }

  async addItem(userId: string, dto: { productId: string; variantId?: string; quantity: number }) {
    let cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) cart = await this.prisma.cart.create({ data: { userId } });

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new BadRequestException('Product not found');

    const existing = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: dto.productId, variantId: dto.variantId || null },
    });

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + dto.quantity },
      });
    }

    return this.prisma.cartItem.create({
      data: { cartId: cart.id, productId: dto.productId, variantId: dto.variantId, quantity: dto.quantity },
    });
  }

  updateItem(itemId: string, quantity: number) {
    if (quantity < 1) return this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  removeItem(itemId: string) {
    return this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { cleared: true };
  }
}
