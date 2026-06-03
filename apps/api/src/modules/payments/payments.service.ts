import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MtnMomoProvider } from './providers/mtn-momo.provider';
import { AirtelMoneyProvider } from './providers/airtel-money.provider';
import { PesapalProvider } from './providers/pesapal.provider';
import { IPaymentProvider, PaymentInitParams } from './interfaces/payment-provider.interface';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private providers: Map<PaymentMethod, IPaymentProvider>;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private notifications: NotificationsService,
    private walletService: WalletService,
    private mtnMomo: MtnMomoProvider,
    private airtelMoney: AirtelMoneyProvider,
    private pesapal: PesapalProvider,
  ) {
    // Register all payment providers
    this.providers = new Map<PaymentMethod, IPaymentProvider>([
      [PaymentMethod.MTN_MOMO, mtnMomo],
      [PaymentMethod.AIRTEL_MONEY, airtelMoney],
      [PaymentMethod.PESAPAL, pesapal],
    ]);
  }

  // ── Initiate Payment ──────────────────────────────────────────────────────────
  async initiatePayment(orderId: string, method: PaymentMethod, phone?: string, email?: string, customReturnUrl?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { buyer: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Order already paid');
    }

    // Cash on delivery — no provider needed
    if (method === PaymentMethod.CASH_ON_DELIVERY) {
      await this.prisma.payment.upsert({
        where: { orderId },
        create: { orderId, method, status: PaymentStatus.PENDING, amount: order.total, currency: order.currency },
        update: { method, status: PaymentStatus.PENDING },
      });
      return { success: true, message: 'Cash on delivery order confirmed' };
    }

    const provider = this.providers.get(method);
    if (!provider) throw new BadRequestException(`Payment method ${method} not supported`);

    const buyerName = [order.buyer.firstName, order.buyer.lastName].filter(Boolean).join(' ')
      || order.buyer.email || '';

    const params: PaymentInitParams = {
      orderId,
      amount: Number(order.total),
      currency: order.currency,
      phone: phone || order.buyer.phone || undefined,
      email: email || order.buyer.email || undefined,
      customerName: buyerName,
      description: `Payment for order ${order.orderNumber}`.slice(0, 100),
      callbackUrl: `${this.config.get('API_URL')}/api/v1/payments/callback/${method.toLowerCase()}`,
      returnUrl: customReturnUrl || `${this.config.get('WEB_URL')}/orders/${orderId}/payment-status`,
    };

    const result = await provider.initiate(params);

    // Save payment record
    await this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        method,
        status: result.success ? PaymentStatus.PROCESSING : PaymentStatus.FAILED,
        amount: order.total,
        currency: order.currency,
        phone,
        providerRef: result.providerRef,
      },
      update: {
        method,
        status: result.success ? PaymentStatus.PROCESSING : PaymentStatus.FAILED,
        providerRef: result.providerRef,
        phone,
      },
    });

    return { ...result };
  }

  // ── Verify & Confirm Payment ──────────────────────────────────────────────────
  async confirmPayment(orderId: string) {
    this.logger.log(`Confirming payment for order ${orderId}`);

    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    if (!payment) {
      this.logger.warn(`No payment record found for order ${orderId}`);
      throw new NotFoundException('Payment record not found');
    }

    // Already completed — return early without re-verifying
    if (payment.status === 'COMPLETED') {
      this.logger.log(`Payment for order ${orderId} already confirmed`);
      return { success: true, status: 'COMPLETED', providerRef: payment.providerRef, amount: Number(payment.amount), currency: payment.currency };
    }

    const provider = this.providers.get(payment.method as PaymentMethod);
    if (!provider) {
      throw new BadRequestException(`No provider for ${payment.method}`);
    }

    const result = await provider.verify(payment.providerRef || '');
    this.logger.log(`Payment verification result for order ${orderId}: status=${result.status}, success=${result.success}`);

    const newPaymentStatus = result.status === 'COMPLETED' ? PaymentStatus.COMPLETED
      : result.status === 'PENDING' ? PaymentStatus.PROCESSING
      : PaymentStatus.FAILED;

    await this.prisma.payment.update({
      where: { orderId },
      data: {
        status: newPaymentStatus,
        confirmedAt: result.status === 'COMPLETED' ? new Date() : undefined,
        failedAt: result.status === 'FAILED' ? new Date() : undefined,
        providerPayload: result.rawResponse || {},
      },
    });

    if (result.status === 'COMPLETED') {
      this.logger.log(`Payment COMPLETED for order ${orderId} — updating order status`);

      // Update order status to PROCESSING and payment status to COMPLETED
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
          status: 'PROCESSING',
        },
      });

      // Record status history
      await this.prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: 'PROCESSING',
          note: `Payment confirmed via ${payment.method}. Ref: ${payment.providerRef}`,
        },
      }).catch(() => null);

      // Fetch order with items to credit seller wallets
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { buyer: true, items: true },
      });

      if (order) {
        // Credit each seller's wallet based on order items
        const sellerTotals = new Map<string, number>();
        for (const item of order.items) {
          const earning = Number(item.sellerEarning) || (Number(item.subtotal) - Number(item.commission));
          const current = sellerTotals.get(item.sellerId) || 0;
          sellerTotals.set(item.sellerId, current + earning);
        }

        for (const [sellerId, amount] of sellerTotals) {
          if (amount > 0) {
            await this.walletService.creditSeller(
              sellerId,
              amount,
              `Earnings from order ${order.orderNumber}`,
              order.id,
            ).catch((err) => this.logger.error(`Failed to credit seller ${sellerId}: ${err.message}`));
            this.logger.log(`Credited seller ${sellerId} with ${amount} for order ${order.orderNumber}`);
          }
        }

        // Credit admin/platform commission
        let totalCommission = 0;
        for (const item of order.items) {
          totalCommission += Number(item.commission) || 0;
        }
        if (totalCommission > 0) {
          // Find the platform admin to credit
          const admin = await this.prisma.user.findFirst({
            where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
          });
          if (admin) {
            await this.walletService.creditBuyer(
              admin.id,
              totalCommission,
              `Platform commission from order ${order.orderNumber}`,
              `commission-${order.id}`,
            ).catch((err) => this.logger.error(`Failed to credit admin commission: ${err.message}`));
            this.logger.log(`Credited admin ${admin.id} with ${totalCommission} commission for order ${order.orderNumber}`);
          } else {
            this.logger.warn(`No admin user found to credit commission of ${totalCommission}`);
          }
        }

        // Notify buyer
        this.logger.log(`Notifying buyer ${order.buyerId} for order ${order.orderNumber}`);
        await this.notifications.sendPushNotification(
          order.buyer.fcmToken || '',
          'Payment Confirmed!',
          `Your order ${order.orderNumber} payment has been confirmed.`,
          { orderId },
        ).catch(() => null);
      }
    }

    return result;
  }

  // ── Handle IPN Callback ───────────────────────────────────────────────────────
  async handleCallback(provider: string, payload: any) {
    this.logger.log(`Payment callback from ${provider}: ${JSON.stringify(payload)}`);

    let orderId: string;

    switch (provider.toLowerCase()) {
      case 'mtn_momo':
        orderId = payload.externalId || payload.financialTransactionId;
        break;
      case 'pesapal':
        orderId = payload.OrderMerchantReference;
        break;
      case 'airtel_money':
        orderId = payload.transaction?.id;
        break;
      default:
        this.logger.warn(`Unknown payment provider: ${provider}`);
        return { received: true };
    }

    if (!orderId) {
      this.logger.error(`Could not extract orderId from ${provider} callback payload`);
      return { received: true, error: 'No orderId' };
    }

    this.logger.log(`Processing callback for order ${orderId} from ${provider}`);
    const result = await this.confirmPayment(orderId);
    this.logger.log(`Callback processed for order ${orderId}: status=${result.status}`);
    return { received: true, status: result.status };
  }

  // ── Get Payment By Order ──────────────────────────────────────────────────────
  async getPaymentByOrder(orderId: string) {
    return this.prisma.payment.findUnique({ where: { orderId } });
  }
}
