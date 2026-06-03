import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from './subscriptions.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Daily subscription cron — drives the ACTIVE → GRACE → EXPIRED state machine
 * and sends -7d / -3d / -1d renewal reminders.
 *
 * Both behaviors are gated by Setting flags so operators can ramp safely:
 *   - `feature_subscriptions_enforced` — when "true", status transitions apply
 *   - `feature_subscription_reminders` — when "true", reminders are sent
 *
 * Default OFF for both. The cron still runs and logs counts so ops can verify
 * the math before flipping the switches.
 *
 * Schedule: 02:00 Africa/Kampala daily (= 23:00 UTC the previous day).
 */
@Injectable()
export class SubscriptionsCron {
  private readonly logger = new Logger(SubscriptionsCron.name);

  constructor(
    private prisma: PrismaService,
    private subscriptions: SubscriptionsService,
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { timeZone: 'Africa/Kampala' })
  async runDaily() {
    this.logger.log('Subscription cron tick starting…');
    try {
      // Stage 1: status transitions (ACTIVE→GRACE→EXPIRED). Gated internally.
      const stateResult = await this.subscriptions.checkExpiredSubscriptions();

      // Stage 2: reminders. Gated by separate flag because operators may want to
      // turn reminders on BEFORE enforcement (warning shots before the lights cut).
      const remindersOn = await this._isReminderFlagOn();
      let remindersSent = 0;
      if (remindersOn) {
        for (const bucket of [7, 3, 1]) {
          remindersSent += await this._sendBucket(bucket);
        }
      }

      this.logger.log(
        `Subscription cron complete: ${JSON.stringify({
          ...stateResult,
          remindersOn,
          remindersSent,
        })}`,
      );
    } catch (e: any) {
      // Never let cron failure cascade — log and continue. Sentry (M1.10) will
      // capture the exception via GlobalExceptionFilter equivalent for cron.
      this.logger.error(`Subscription cron failed: ${e?.message}`, e?.stack);
    }
  }

  private async _sendBucket(bucketDays: number): Promise<number> {
    const subs = await this.subscriptions.findSubscriptionsForReminderBucket(bucketDays);
    if (subs.length === 0) return 0;
    this.logger.log(`Sending ${bucketDays}d reminders to ${subs.length} sellers`);

    const channel = `${bucketDays}d`;
    let sent = 0;
    for (const sub of subs) {
      const title = `Your TotalStore subscription renews in ${bucketDays} day${bucketDays === 1 ? '' : 's'}`;
      const body = `Your "${sub.planName}" plan ends ${this._friendlyDate(sub.expiresAt)}. Renew now to keep premium features.`;

      // Fire-and-forget per channel; failure on one channel doesn't block others.
      const push = sub.sellerFcmToken
        ? this.notifications.sendPushNotification(sub.sellerFcmToken, title, body, {
            subscriptionId: sub.id,
            type: 'subscription_renewal',
          }).catch(() => null)
        : Promise.resolve(null);

      const sms = sub.sellerPhone
        ? this.notifications.sendSms(
            sub.sellerPhone,
            `TotalStore: your ${sub.planName} subscription ends ${this._friendlyDate(sub.expiresAt)}. Open the app to renew.`,
          ).catch(() => null)
        : Promise.resolve(null);

      const email = sub.sellerEmail
        ? this.notifications.sendEmail(sub.sellerEmail, title, body).catch(() => null)
        : Promise.resolve(null);

      await Promise.allSettled([push, sms, email]);
      await this.subscriptions.markReminderSent(sub.id, channel);
      sent++;
    }
    return sent;
  }

  private async _isReminderFlagOn(): Promise<boolean> {
    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'feature_subscription_reminders' },
        select: { value: true },
      });
      return setting?.value === 'true';
    } catch {
      return false;
    }
  }

  private _friendlyDate(d: Date | null): string {
    if (!d) return 'soon';
    return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short' });
  }
}
