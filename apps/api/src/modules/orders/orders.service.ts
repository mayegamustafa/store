import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DynamicSettingsService } from '../settings/dynamic-settings.service';
import { EscrowService } from '../wallet/escrow.service';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import * as dayjs from 'dayjs';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private config: ConfigService,
    private settings: DynamicSettingsService,
    private escrow: EscrowService,
  ) {}

  // ── Create Order from Cart ────────────────────────────────────────────────────
  async createFromCart(buyerId: string, dto: { addressId?: string; paymentMethod: any; couponCode?: string; notes?: string; items?: { productId: string; quantity: number; variantId?: string }[] }) {
    // Use items from DTO if provided (frontend Zustand cart), otherwise fall back to DB cart
    let cartItems: { productId: string; quantity: number; variantId?: string; product?: any; variant?: any }[] = [];

    if (dto.items && dto.items.length > 0) {
      // Fetch product details for each item from DTO
      const products = await this.prisma.product.findMany({
        where: { id: { in: dto.items.map((i) => i.productId) } },
        include: { seller: true },
      });
      const variants = dto.items.filter((i) => i.variantId).length > 0
        ? await this.prisma.productVariant.findMany({
            where: { id: { in: dto.items.filter((i) => i.variantId).map((i) => i.variantId!) } },
          })
        : [];
      cartItems = dto.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        variantId: i.variantId,
        product: products.find((p) => p.id === i.productId),
        variant: variants.find((v) => v.id === i.variantId),
      })).filter((i) => i.product);
    }

    // Fall back to the user's server-side cart if DTO items are absent or all stale/not-found
    if (cartItems.length === 0) {
      const cart = await this.prisma.cart.findUnique({
        where: { userId: buyerId },
        include: {
          items: {
            include: {
              product: { include: { seller: true } },
              variant: true,
            },
          },
        },
      });
      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('No items to order');
      }
      cartItems = cart.items;
    }

    // Every order requires a delivery address (schema: Order.addressId is
    // NOT NULL). Fail fast with a clear message instead of a Prisma 500.
    if (!dto.addressId) {
      throw new BadRequestException('Please select a delivery address before placing the order');
    }
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId: buyerId },
      select: { id: true },
    });
    if (!address) {
      throw new BadRequestException('Delivery address not found — please re-select your address');
    }

    // Validate stock
    for (const item of cartItems) {
      const stock = item.variant ? item.variant.stock : item.product.stock;
      if (stock < item.quantity) {
        throw new BadRequestException(`${item.product.name} has only ${stock} in stock`);
      }
    }

    // Calculate subtotal
    const subtotal = cartItems.reduce((sum, item) => {
      const price = item.variant ? Number(item.variant.price) : Number(item.product.basePrice);
      return sum + price * item.quantity;
    }, 0);

    // Apply coupon (full server-side validation)
    let discount = 0;
    let coupon: any = null;
    if (dto.couponCode) {
      coupon = await this.prisma.coupon.findUnique({ where: { code: dto.couponCode } });
      if (!coupon || !coupon.isActive) {
        throw new BadRequestException('Invalid or inactive coupon code');
      }
      if (coupon.startsAt && coupon.startsAt > new Date()) {
        throw new BadRequestException('This coupon is not yet active');
      }
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new BadRequestException('This coupon has expired');
      }
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw new BadRequestException('This coupon has reached its usage limit');
      }
      if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
        throw new BadRequestException(`Minimum order amount for this coupon is ${coupon.minOrderAmount}`);
      }
      // Per-user usage check
      if (coupon.perUserLimit) {
        const userUsageCount = await this.prisma.order.count({
          where: { buyerId, couponId: coupon.id, status: { not: 'CANCELLED' } },
        });
        if (userUsageCount >= coupon.perUserLimit) {
          throw new BadRequestException('You have already used this coupon the maximum number of times');
        }
      }

      if (coupon.discountType === 'percentage') {
        discount = (subtotal * Number(coupon.discountValue)) / 100;
        if (coupon.maxDiscountAmt && discount > Number(coupon.maxDiscountAmt)) {
          discount = Number(coupon.maxDiscountAmt);
        }
      } else {
        discount = Number(coupon.discountValue);
      }
    }

    const shippingFee = await this.calculateShippingFee(subtotal, cartItems);
    const total = subtotal + shippingFee - discount;

    // Generate order number
    const orderNumber = `TS-${dayjs().format('YYYYMMDD')}-${uuid().slice(0, 6).toUpperCase()}`;

    // Get commission config
    const globalCommission = Number(this.config.get('DEFAULT_COMMISSION_PERCENT', 10));

    // Transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Prisma checked-create: nested items.create forbids raw FK scalars for
      // the order's own relations (buyerId/addressId/couponId) — they must be
      // connects, or the create throws "Argument `buyer` is missing".
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          buyer: { connect: { id: buyerId } },
          address: { connect: { id: dto.addressId! } },
          paymentMethod: dto.paymentMethod,
          subtotal,
          shippingFee,
          discount,
          total,
          notes: dto.notes,
          ...(coupon ? { coupon: { connect: { id: coupon.id } } } : {}),
          items: {
            create: cartItems.map((item) => {
              const price = item.variant ? Number(item.variant.price) : Number(item.product.basePrice);
              const itemSubtotal = price * item.quantity;
              const commissionRate = item.product.seller.commissionRate ?? globalCommission;
              const commission = (itemSubtotal * commissionRate) / 100;
              const sellerEarning = itemSubtotal - commission;

              return {
                product: { connect: { id: item.productId } },
                ...(item.variantId ? { variant: { connect: { id: item.variantId } } } : {}),
                sellerId: item.product.sellerId,
                productName: item.product.name,
                variantName: item.variant?.name,
                productImage: item.product.images[0],
                price,
                quantity: item.quantity,
                subtotal: itemSubtotal,
                commission,
                sellerEarning,
              };
            }),
          },
        },
        include: { items: true },
      });

      // Mark status history
      await tx.orderStatusHistory.create({
        data: { orderId: newOrder.id, status: 'PENDING', note: 'Order created' },
      });

      // Increment coupon usage
      if (coupon) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      // Decrement stock
      for (const item of cartItems) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      // Clear DB cart if it was used
      if (!dto.items || dto.items.length === 0) {
        const cart = await tx.cart.findUnique({ where: { userId: buyerId } });
        if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      return newOrder;
    });

    // Notify buyer + sellers strictly fire-and-forget: SMTP/SMS providers can
    // take 30+ s to fail when unconfigured, and awaiting them made checkout
    // time out in the browser even though the order was already created.
    void (async () => {
      const buyer = await this.prisma.user.findUnique({ where: { id: buyerId } });
      if (buyer) {
        await this.notifications.notifyOrderPlaced(
          buyer.id, order.id, orderNumber, String(Math.round(subtotal - discount)),
        ).catch(() => null);
      }
      const sellerIds = [...new Set(order.items.map((i: any) => i.sellerId).filter(Boolean))];
      for (const sid of sellerIds) {
        const seller = await this.prisma.sellerProfile.findUnique({ where: { id: sid as string }, select: { userId: true } });
        if (seller?.userId) {
          await this.notifications.notifySellerNewOrder(
            seller.userId, order.id, orderNumber, String(Math.round(subtotal - discount)),
          ).catch(() => null);
        }
      }
    })().catch(() => null);

    return order;
  }

  // ── Dynamic Shipping Fee ───────────────────────────────────────────────────
  private async calculateShippingFee(subtotal: number, cartItems: any[]): Promise<number> {
    const freeThreshold = Number(await this.settings.get('FREE_DELIVERY_THRESHOLD')) || 150000;
    if (subtotal >= freeThreshold) return 0;

    // Check if any cart item has a per-product delivery fee set
    const perProductFees = cartItems
      .filter((item) => item.product.deliveryFee !== null && item.product.deliveryFee !== undefined)
      .map((item) => Number(item.product.deliveryFee));

    if (perProductFees.length > 0) {
      // Use the highest per-product fee among items that have one set
      return Math.max(...perProductFees);
    }

    const defaultFee = Number(await this.settings.get('DELIVERY_FEE_DEFAULT')) || 5000;
    return defaultFee;
  }

  // ── Get Orders (Buyer) ────────────────────────────────────────────────────────
  async getBuyerOrders(buyerId: string, page = 1, limit = 10) {
    const p = Math.max(1, +page || 1);
    const l = Math.max(1, Math.min(100, +limit || 10));
    const skip = (p - 1) * l;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { buyerId },
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: { product: { select: { images: true } } },
          },
          delivery: { select: { status: true } },
        },
      }),
      this.prisma.order.count({ where: { buyerId } }),
    ]);
    return { data: orders, meta: { total, page: p, limit: l } };
  }

  // ── Get Single Order ──────────────────────────────────────────────────────────
  async findOne(orderId: string, userId: string, role: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true, variant: true } },
        address: true,
        payment: true,
        delivery: { include: { rider: { include: { user: { select: { firstName: true, phone: true } } } } } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        buyer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Check access
    if (role === 'BUYER' && order.buyerId !== userId) throw new NotFoundException('Order not found');

    return order;
  }

  // ── Cancel Order ──────────────────────────────────────────────────────────────
  async cancelOrder(orderId: string, buyerId: string, reason: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    await this.notifications.notifyOrderCancelled(buyerId, orderId, order.orderNumber, reason).catch(() => null);
    await this.escrow.reverseForOrder(orderId, reason || 'Order cancelled by buyer').catch(() => null);
    return updated;
  }

  // ── Update Order Status (Seller / Admin) ──────────────────────────────────────
  async updateStatus(orderId: string, status: OrderStatus, note?: string, updatedBy?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: { select: { sellerId: true } } } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status },
      }),
      this.prisma.orderStatusHistory.create({
        data: { orderId, status, note, updatedBy },
      }),
    ]);

    // Fire buyer notification (fire-and-forget, no await)
    const buyerId = order.buyerId;
    const onum = order.orderNumber;
    switch (status) {
      case OrderStatus.CONFIRMED:
        this.notifications.notifyOrderConfirmed(buyerId, orderId, onum).catch(() => null);
        break;
      case OrderStatus.PROCESSING:
        this.notifications.sendToUser(buyerId, 'ORDER_CONFIRMED' as any,
          { order_number: onum, order_id: orderId },
          { channels: ['SMS', 'PUSH', 'IN_APP'] as any,
            fallbackSms: `TotalStore: Your order #${onum} is being processed and packed!`,
            route: `/orders/${orderId}` },
        ).catch(() => null);
        break;
      case OrderStatus.SHIPPED:
        this.notifications.notifyOrderShipped(buyerId, orderId, onum).catch(() => null);
        break;
      case OrderStatus.OUT_FOR_DELIVERY:
        this.notifications.notifyOutForDelivery(buyerId, orderId, onum).catch(() => null);
        break;
      case OrderStatus.DELIVERED:
        this.notifications.notifyOrderDelivered(buyerId, orderId, onum).catch(() => null);
        // Start the escrow countdown — held seller earnings release after
        // ESCROW_HOLD_DAYS from delivery (see EscrowService cron)
        this.escrow.scheduleRelease(orderId).catch(() => null);
        break;
      case OrderStatus.CANCELLED:
        this.notifications.notifyOrderCancelled(buyerId, orderId, onum, note).catch(() => null);
        this.escrow.reverseForOrder(orderId, note || 'Order cancelled').catch(() => null);
        break;
    }

    return updated;
  }

  // ── Track order by order number ──────────────────────────────────────────────
  async trackByOrderNumber(orderNumber: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true, images: true } },
          },
        },
        delivery: true,
        address: true,
      },
    });
    if (!order) throw new Error('Order not found');
    return order;
  }

  // ── Create a return/refund request ───────────────────────────────────────────
  async createReturnRequest(orderId: string, userId: string, dto: {
    reason: string;
    items?: { orderItemId: string; quantity: number }[];
    refundMethod?: string;
  }) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    return this.prisma.returnRequest.create({
      data: {
        orderId,
        reason: dto.reason,
        refundMethod: dto.refundMethod ?? 'ORIGINAL',
      } as any,
    });
  }

  // ── Get Tracking Details ──────────────────────────────────────────────────────
  async getTracking(orderId: string, userId: string, role: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, buyerId: true, orderNumber: true, status: true, createdAt: true, address: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (role === 'BUYER' && order.buyerId !== userId) throw new NotFoundException('Order not found');

    const delivery = await this.prisma.delivery.findUnique({
      where: { orderId },
      include: {
        rider: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true } },
            locationLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
          },
        },
        statusLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    return { order, delivery };
  }

  // ── Generate PDF Receipt ───────────────────────────────────────────────────
  async generateReceipt(orderId: string, userId: string, role: string): Promise<Buffer> {
    const order = await this.findOne(orderId, userId, role);
    if (!order) throw new NotFoundException('Order not found');

    const payment = (order as any).payment;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('TotalStore', { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#666666').text('Payment Receipt', { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown();

      // Order details
      doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold');
      doc.text(`Order #: ${(order as any).orderNumber}`);
      doc.font('Helvetica').fontSize(10).fillColor('#444444');
      doc.text(`Date: ${dayjs((order as any).createdAt).format('DD MMM YYYY, hh:mm A')}`);
      doc.text(`Status: ${(order as any).status}`);
      doc.text(`Payment: ${payment?.method || (order as any).paymentMethod} — ${payment?.status || (order as any).paymentStatus}`);
      if (payment?.providerRef) doc.text(`Reference: ${payment.providerRef}`);
      if (payment?.confirmedAt) doc.text(`Confirmed: ${dayjs(payment.confirmedAt).format('DD MMM YYYY, hh:mm A')}`);
      doc.moveDown();

      // Buyer details
      const buyer = (order as any).buyer;
      if (buyer) {
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text('Bill To:');
        doc.font('Helvetica').fontSize(10).fillColor('#444444');
        doc.text([buyer.firstName, buyer.lastName].filter(Boolean).join(' '));
        if (buyer.phone) doc.text(buyer.phone);
        if (buyer.email) doc.text(buyer.email);
      }

      // Address
      const addr = (order as any).address;
      if (addr) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text('Delivery Address:');
        doc.font('Helvetica').fontSize(10).fillColor('#444444');
        doc.text([addr.addressLine1, addr.city, addr.district, addr.country].filter(Boolean).join(', '));
      }
      doc.moveDown();

      // Items table header
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.5);
      const tableTop = doc.y;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
      doc.text('Item', 50, tableTop, { width: 250 });
      doc.text('Qty', 310, tableTop, { width: 50, align: 'center' });
      doc.text('Price', 370, tableTop, { width: 80, align: 'right' });
      doc.text('Total', 460, tableTop, { width: 85, align: 'right' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.3);

      // Items rows
      const items = (order as any).items || [];
      doc.font('Helvetica').fontSize(9).fillColor('#333333');
      for (const item of items) {
        const y = doc.y;
        const itemName = item.productName + (item.variantName ? ` (${item.variantName})` : '');
        doc.text(itemName, 50, y, { width: 250 });
        doc.text(String(item.quantity), 310, y, { width: 50, align: 'center' });
        doc.text(`UGX ${Number(item.price).toLocaleString()}`, 370, y, { width: 80, align: 'right' });
        doc.text(`UGX ${Number(item.subtotal).toLocaleString()}`, 460, y, { width: 85, align: 'right' });
        doc.moveDown(0.5);
      }

      // Totals
      doc.moveDown(0.3);
      doc.moveTo(350, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#444444');
      const totalsX = 370;
      const totalsValX = 460;
      doc.text('Subtotal:', totalsX, doc.y, { width: 80, align: 'right' });
      doc.text(`UGX ${Number((order as any).subtotal).toLocaleString()}`, totalsValX, doc.y - doc.currentLineHeight(), { width: 85, align: 'right' });
      doc.moveDown(0.3);

      if (Number((order as any).shippingFee) > 0) {
        doc.text('Delivery:', totalsX, doc.y, { width: 80, align: 'right' });
        doc.text(`UGX ${Number((order as any).shippingFee).toLocaleString()}`, totalsValX, doc.y - doc.currentLineHeight(), { width: 85, align: 'right' });
        doc.moveDown(0.3);
      }

      if (Number((order as any).discount) > 0) {
        doc.text('Discount:', totalsX, doc.y, { width: 80, align: 'right' });
        doc.text(`-UGX ${Number((order as any).discount).toLocaleString()}`, totalsValX, doc.y - doc.currentLineHeight(), { width: 85, align: 'right' });
        doc.moveDown(0.3);
      }

      doc.moveDown(0.2);
      doc.moveTo(350, doc.y).lineTo(545, doc.y).strokeColor('#000000').stroke();
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000');
      doc.text('Total:', totalsX, doc.y, { width: 80, align: 'right' });
      doc.text(`UGX ${Number((order as any).total).toLocaleString()}`, totalsValX, doc.y - doc.currentLineHeight(), { width: 85, align: 'right' });

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').fillColor('#999999');
      doc.text('This is a computer-generated receipt and does not require a signature.', { align: 'center' });
      doc.text('TotalStore — totalstoreug.com', { align: 'center' });

      doc.end();
    });
  }
}
