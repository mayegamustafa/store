import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from './wallet.service';
import { DynamicSettingsService } from '../settings/dynamic-settings.service';

/**
 * Escrow lifecycle for seller earnings:
 *
 *   payment COMPLETED ──▶ hold(order, seller, amount)   [pendingBalance += amount]
 *   order DELIVERED   ──▶ scheduleRelease(order)         [releaseAt = now + ESCROW_HOLD_DAYS]
 *   hourly cron       ──▶ releaseDue()                   [pendingBalance -= amount,
 *                                                          walletBalance += amount + ledger row]
 *   order CANCELLED/REFUNDED ──▶ reverseForOrder(order)  [pendingBalance -= amount]
 *
 * ESCROW_ENABLED=false (admin setting) switches the platform back to instant
 * crediting; existing holds still release normally.
 */
@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private settings: DynamicSettingsService,
  ) {}

  async isEnabled(): Promise<boolean> {
    return (await this.settings.get('ESCROW_ENABLED')) !== 'false';
  }

  async holdDays(): Promise<number> {
    const raw = Number(await this.settings.get('ESCROW_HOLD_DAYS'));
    return Number.isFinite(raw) && raw >= 0 ? raw : 3;
  }

  /** Put a seller's earnings for an order into escrow (pending balance). */
  async hold(orderId: string, sellerId: string, amount: number, orderNumber?: string) {
    if (amount <= 0) return;
    await this.prisma.$transaction(async (tx) => {
      // Unique (orderId, sellerId) makes payment-confirmation retries a no-op
      const existing = await tx.escrowHold.findUnique({
        where: { orderId_sellerId: { orderId, sellerId } },
      });
      if (existing) return;
      await tx.escrowHold.create({
        data: { orderId, sellerId, amount: new Decimal(amount) },
      });
      await tx.sellerProfile.update({
        where: { id: sellerId },
        data: { pendingBalance: { increment: amount } },
      });
    });
    this.logger.log(`Escrow hold: ${amount} for seller ${sellerId} (order ${orderNumber || orderId})`);
  }

  /** Called when an order is delivered — start the release countdown. */
  async scheduleRelease(orderId: string) {
    const days = await this.holdDays();
    const releaseAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const res = await this.prisma.escrowHold.updateMany({
      where: { orderId, status: 'HELD', releaseAt: null },
      data: { releaseAt },
    });
    if (res.count > 0) {
      this.logger.log(`Escrow release scheduled for order ${orderId}: ${res.count} hold(s) at ${releaseAt.toISOString()}`);
    }
  }

  /** Reverse all holds for an order (cancellation / refund before release). */
  async reverseForOrder(orderId: string, reason?: string) {
    const holds = await this.prisma.escrowHold.findMany({ where: { orderId, status: 'HELD' } });
    for (const hold of holds) {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.escrowHold.updateMany({
          where: { id: hold.id, status: 'HELD' },
          data: { status: 'REVERSED', releasedAt: new Date() },
        });
        if (claimed.count === 0) return;
        await tx.sellerProfile.update({
          where: { id: hold.sellerId },
          data: { pendingBalance: { decrement: hold.amount } },
        });
      });
      this.logger.log(`Escrow reversed: ${hold.amount} for seller ${hold.sellerId} (order ${orderId})${reason ? ` — ${reason}` : ''}`);
    }
    return holds.length;
  }

  /** Hourly: move due holds from pending to available balance. */
  @Cron(CronExpression.EVERY_HOUR)
  async releaseDue() {
    const due = await this.prisma.escrowHold.findMany({
      where: { status: 'HELD', releaseAt: { not: null, lte: new Date() } },
      take: 200,
    });
    if (!due.length) return;
    this.logger.log(`Releasing ${due.length} due escrow hold(s)`);

    for (const hold of due) {
      try {
        // Claim first so a concurrent cron run (or restart) can't double-release
        const claimed = await this.prisma.escrowHold.updateMany({
          where: { id: hold.id, status: 'HELD' },
          data: { status: 'RELEASED', releasedAt: new Date() },
        });
        if (claimed.count === 0) continue;

        await this.prisma.sellerProfile.update({
          where: { id: hold.sellerId },
          data: { pendingBalance: { decrement: hold.amount } },
        });
        await this.walletService.creditSeller(
          hold.sellerId,
          Number(hold.amount),
          `Escrow released for order ${hold.orderId}`,
          `escrow-${hold.id}`,
        );
      } catch (e: any) {
        this.logger.error(`Failed to release escrow hold ${hold.id}: ${e?.message || e}`);
      }
    }
  }

  /** Pending (escrowed) balance for a seller, with their holds. */
  async getSellerEscrow(sellerId: string) {
    const [profile, holds] = await Promise.all([
      this.prisma.sellerProfile.findUnique({
        where: { id: sellerId },
        select: { pendingBalance: true },
      }),
      this.prisma.escrowHold.findMany({
        where: { sellerId, status: 'HELD' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    return {
      pendingBalance: Number(profile?.pendingBalance ?? 0),
      holds: holds.map((h) => ({
        id: h.id,
        orderId: h.orderId,
        amount: Number(h.amount),
        releaseAt: h.releaseAt,
        createdAt: h.createdAt,
      })),
    };
  }
}
