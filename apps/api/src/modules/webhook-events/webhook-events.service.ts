import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type WebhookProvider = 'pesapal' | 'mtn_momo' | 'airtel_money';

/**
 * WebhookEvent: idempotency + audit layer for payment provider IPNs.
 *
 * Pesapal, MTN, and Airtel all retry IPNs aggressively (multiple times over minutes
 * if the response is anything but 200 OK). Without dedup we credit wallets twice.
 *
 * Pattern:
 *   const event = await service.record('pesapal', orderTrackingId, payload);
 *   if (event.isDuplicate) return ack();  // silently ack — already handled
 *   try {
 *     await processPayment(...);
 *     await service.markProcessed(event.id);
 *   } catch (e) {
 *     await service.markFailed(event.id, e.message);  // safe to retry; row stays for inspection
 *     throw e;
 *   }
 */
@Injectable()
export class WebhookEventsService {
  private readonly logger = new Logger(WebhookEventsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Atomically record-or-detect-duplicate.
   * Returns { id, isDuplicate }. If isDuplicate, the caller MUST short-circuit
   * (ack the provider, do not re-process payment).
   */
  async record(
    provider: WebhookProvider,
    providerEventId: string,
    payload: Record<string, any>,
    signature?: string,
  ): Promise<{ id: string; isDuplicate: boolean }> {
    if (!providerEventId) {
      // No event ID = cannot dedupe. Insert with synthetic ID so we still log it.
      providerEventId = `no-id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
    try {
      const row = await this.prisma.webhookEvent.create({
        data: {
          provider,
          providerEventId,
          signature: signature ?? null,
          payload: payload as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      return { id: row.id, isDuplicate: false };
    } catch (e: any) {
      // P2002 = unique constraint violation = duplicate event
      if (e?.code === 'P2002') {
        const existing = await this.prisma.webhookEvent.findUnique({
          where: { provider_providerEventId: { provider, providerEventId } },
          select: { id: true },
        });
        this.logger.log(`Duplicate ${provider} IPN suppressed: ${providerEventId}`);
        return { id: existing!.id, isDuplicate: true };
      }
      throw e;
    }
  }

  async markProcessed(id: string) {
    await this.prisma.webhookEvent.update({
      where: { id },
      data: { status: 'PROCESSED', processedAt: new Date(), processingError: null },
    });
  }

  async markFailed(id: string, error: string) {
    await this.prisma.webhookEvent.update({
      where: { id },
      data: { status: 'FAILED', processingError: error.slice(0, 500) },
    });
  }
}
