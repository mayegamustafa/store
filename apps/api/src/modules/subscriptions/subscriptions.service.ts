import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PesapalProvider } from '../payments/providers/pesapal.provider';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private pesapal: PesapalProvider,
  ) {}

  // ── Plans (Admin) ─────────────────────────────────────────────────────────────

  async listPlans(includeInactive = false) {
    return this.prisma.subscriptionPlan.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
      include: {
        _count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } },
      },
    });
  }

  async createPlan(dto: {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    billingCycle?: string;
    features?: string[];
    maxProducts?: number;
    sortOrder?: number;
  }) {
    return this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        currency: dto.currency || 'UGX',
        billingCycle: dto.billingCycle || 'MONTHLY',
        features: dto.features || [],
        maxProducts: dto.maxProducts ?? 0,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updatePlan(id: string, dto: Partial<{
    name: string;
    description: string;
    price: number;
    currency: string;
    billingCycle: string;
    features: string[];
    maxProducts: number;
    isActive: boolean;
    sortOrder: number;
  }>) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return this.prisma.subscriptionPlan.update({ where: { id }, data: dto as any });
  }

  async deletePlan(id: string) {
    const activeCount = await this.prisma.sellerSubscription.count({
      where: { planId: id, status: 'ACTIVE' },
    });
    if (activeCount > 0) {
      throw new BadRequestException(`Cannot delete plan with ${activeCount} active subscriber(s). Deactivate it instead.`);
    }
    return this.prisma.subscriptionPlan.delete({ where: { id } });
  }

  // ── Subscriptions (Seller) ────────────────────────────────────────────────────

  async getMySubscription(sellerId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId: sellerId },
      include: {
        subscriptions: {
          // M3b.0: include GRACE so seller UIs can render the "renew before grace
          // ends" banner. `isActive` semantics unchanged — GRACE is *visible* but
          // not *active*.
          where: { status: { in: ['ACTIVE', 'PENDING', 'GRACE'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
      },
    });
    if (!seller) throw new NotFoundException('Seller profile not found');
    const current = seller.subscriptions[0] ?? null;
    return {
      subscription: current,
      isActive: current?.status === 'ACTIVE' && (!current.expiresAt || current.expiresAt > new Date()),
      inGrace: current?.status === 'GRACE',
    };
  }

  async subscribe(sellerId: string, planId: string, paymentMethod = 'PESAPAL') {
    // Pull user email/phone alongside the seller profile — Pesapal rejects malformed
    // emails, and the previous code passed `seller.userId` (a UUID) as the email.
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId: sellerId },
      include: { user: { select: { email: true, phone: true, firstName: true, lastName: true } } },
    });
    if (!seller) throw new NotFoundException('Seller profile not found');

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) throw new NotFoundException('Subscription plan not found or inactive');

    // Free plan — activate immediately
    if (Number(plan.price) === 0) {
      const sub = await this.prisma.sellerSubscription.create({
        data: {
          sellerId: seller.id,
          planId,
          status: 'ACTIVE',
          paymentMethod: 'FREE',
          amount: 0,
          startedAt: new Date(),
          expiresAt: this._calcExpiry(plan.billingCycle),
        },
        include: { plan: true },
      });
      return { redirectUrl: null, subscription: sub, requiresPayment: false };
    }

    // Create a pending subscription record
    const sub = await this.prisma.sellerSubscription.create({
      data: {
        sellerId: seller.id,
        planId,
        status: 'PENDING',
        paymentMethod,
        amount: plan.price,
      },
    });

    // Initiate Pesapal payment using the subscription ID as the merchant reference
    const apiUrl = this.config.get('API_URL', 'https://shop.saktech.org/api/v1');
    const returnUrl = `${apiUrl}/api/v1/subscriptions/callback?subscriptionId=${sub.id}`;

    const result = await this.pesapal.initiate({
      orderId: sub.id,
      amount: Number(plan.price),
      currency: plan.currency,
      description: `TotalStore ${plan.name} subscription (${plan.billingCycle})`,
      callbackUrl: returnUrl,
      returnUrl,
      email: seller.user?.email || `seller-${seller.id}@totalstore.ug`,
      phone: seller.user?.phone || undefined,
      customerName: [seller.user?.firstName, seller.user?.lastName].filter(Boolean).join(' ') || seller.storeName,
    });

    if (!result.success) {
      await this.prisma.sellerSubscription.delete({ where: { id: sub.id } }).catch(() => null);
      throw new BadRequestException(result.message || 'Payment initiation failed');
    }

    await this.prisma.sellerSubscription.update({
      where: { id: sub.id },
      data: { paymentRef: result.providerRef },
    });

    return { redirectUrl: result.redirectUrl, subscriptionId: sub.id, requiresPayment: true };
  }

  async activateSubscription(subscriptionId: string) {
    const sub = await this.prisma.sellerSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.status === 'ACTIVE') return { success: true, subscription: sub };

    // Verify payment via Pesapal
    if (sub.paymentRef) {
      const verification = await this.pesapal.verify(sub.paymentRef);
      if (!verification.success) {
        this.logger.warn(`Payment verification failed for subscription ${subscriptionId}`);
        return { success: false, message: 'Payment not confirmed yet' };
      }
    }

    const now = new Date();
    const updated = await this.prisma.sellerSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE',
        startedAt: now,
        expiresAt: this._calcExpiry(sub.plan.billingCycle),
      },
      include: { plan: true },
    });

    this.logger.log(`Subscription ${subscriptionId} activated for seller ${sub.sellerId}`);
    return { success: true, subscription: updated };
  }

  async listSellerSubscriptions(sellerId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId: sellerId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    return this.prisma.sellerSubscription.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
  }

  /**
   * Daily cron entry point. Three-stage state machine:
   *
   *   ACTIVE (expiresAt < now)              → GRACE   (graceUntil = now + 3 days)
   *   GRACE  (graceUntil < now)             → EXPIRED
   *
   * When `feature_subscriptions_enforced` Setting is `false` (default), the cron
   * runs in **dry-run** mode — counts and logs only, no transitions applied. This
   * lets ops watch the logs for a few days before flipping the switch.
   *
   * Returns `{ enforced, activeToGrace, graceToExpired }` for cron logging.
   */
  async checkExpiredSubscriptions() {
    const now = new Date();
    const enforced = await this._isEnforcementOn();

    // Stage 1: ACTIVE → GRACE
    const activeExpired = await this.prisma.sellerSubscription.findMany({
      where: { status: 'ACTIVE', expiresAt: { lt: now } },
      select: { id: true, sellerId: true, expiresAt: true },
    });
    if (enforced && activeExpired.length) {
      const graceUntil = new Date(now);
      graceUntil.setDate(graceUntil.getDate() + 3); // 3-day grace
      await this.prisma.sellerSubscription.updateMany({
        where: { id: { in: activeExpired.map((s) => s.id) } },
        data: { status: 'GRACE', graceUntil },
      });
    }

    // Stage 2: GRACE → EXPIRED
    const graceExpired = await this.prisma.sellerSubscription.findMany({
      where: { status: 'GRACE', graceUntil: { lt: now } },
      select: { id: true, sellerId: true },
    });
    if (enforced && graceExpired.length) {
      await this.prisma.sellerSubscription.updateMany({
        where: { id: { in: graceExpired.map((s) => s.id) } },
        data: { status: 'EXPIRED' },
      });
    }

    this.logger.log(
      `Subscription cron${enforced ? '' : ' [DRY RUN]'}: ACTIVE→GRACE=${activeExpired.length}, GRACE→EXPIRED=${graceExpired.length}`,
    );
    return {
      enforced,
      activeToGrace: activeExpired.length,
      graceToExpired: graceExpired.length,
    };
  }

  /**
   * Plan-limit gate used by ProductsService.create(). Returns `{ allowed, limit, used, planName }`.
   *
   * Permissive when `feature_subscriptions_enforced` is `false` — every seller can
   * add unlimited products until the operator flips the flag.
   *
   * Free-tier (no subscription) sellers fall back to the cheapest active plan with
   * `maxProducts > 0`; if no such plan exists, they're allowed without limit.
   *
   * GRACE-state sellers retain their plan benefits (the whole point of grace).
   * EXPIRED sellers are treated as no-subscription.
   */
  async canSellerAddProduct(
    sellerProfileId: string,
  ): Promise<{ allowed: boolean; limit: number; used: number; planName: string }> {
    const enforced = await this._isEnforcementOn();
    if (!enforced) {
      return { allowed: true, limit: 0, used: 0, planName: 'Enforcement disabled' };
    }

    // Active or grace subscription = current plan applies.
    const sub = await this.prisma.sellerSubscription.findFirst({
      where: { sellerId: sellerProfileId, status: { in: ['ACTIVE', 'GRACE'] } },
      orderBy: { createdAt: 'desc' },
      include: { plan: { select: { name: true, maxProducts: true } } },
    });

    let limit = 0;
    let planName = 'Free';
    if (sub) {
      limit = sub.plan.maxProducts;
      planName = sub.plan.name;
    } else {
      // No active sub — fall back to the cheapest active plan with maxProducts set.
      const fallback = await this.prisma.subscriptionPlan.findFirst({
        where: { isActive: true, price: 0, maxProducts: { gt: 0 } },
        orderBy: { sortOrder: 'asc' },
      });
      if (fallback) {
        limit = fallback.maxProducts;
        planName = fallback.name;
      }
    }

    if (limit === 0) {
      return { allowed: true, limit: 0, used: 0, planName }; // unlimited
    }

    const used = await this.prisma.product.count({ where: { sellerId: sellerProfileId } });
    return { allowed: used < limit, limit, used, planName };
  }

  /**
   * Read the `feature_subscriptions_enforced` flag from the Setting table.
   * Default OFF (false) — operator must explicitly enable enforcement.
   */
  private async _isEnforcementOn(): Promise<boolean> {
    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'feature_subscriptions_enforced' },
        select: { value: true },
      });
      return setting?.value === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Reminder bucket helper — finds subs that need a reminder for the given
   * day-bucket and hasn't already received one.
   *
   * Buckets are computed from `expiresAt`: an `expiresAt` between `now + (bucket-1)d`
   * and `now + bucket d` falls into bucket `bucket`. So 7d covers 6-7 days remaining.
   */
  async findSubscriptionsForReminderBucket(
    bucketDays: number,
  ): Promise<Array<{ id: string; sellerId: string; expiresAt: Date | null; planName: string; sellerUserId: string; sellerEmail: string | null; sellerPhone: string | null; sellerFcmToken: string | null }>> {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() + bucketDays - 1);
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + bucketDays);

    const candidates = await this.prisma.sellerSubscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'GRACE'] },
        expiresAt: { gte: windowStart, lt: windowEnd },
        // Anti-spam: skip subs that already got this bucket's reminder.
        reminders: { none: { bucket: `${bucketDays}d` } },
      },
      include: {
        plan: { select: { name: true } },
        seller: {
          include: { user: { select: { id: true, email: true, phone: true, fcmToken: true } } },
        },
      },
    });

    return candidates.map((s) => ({
      id: s.id,
      sellerId: s.sellerId,
      expiresAt: s.expiresAt,
      planName: s.plan.name,
      sellerUserId: s.seller.user.id,
      sellerEmail: s.seller.user.email,
      sellerPhone: s.seller.user.phone,
      sellerFcmToken: s.seller.user.fcmToken,
    }));
  }

  async markReminderSent(subscriptionId: string, bucket: string) {
    await this.prisma.subscriptionReminder
      .create({ data: { subscriptionId, bucket } })
      .catch(() => null); // Unique constraint = already sent, swallow.
  }

  // ── Admin: subscribers management (M3b.3) ─────────────────────────────────

  async adminListSubscribers(opts: {
    status?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {};
    if (opts.status) where.status = opts.status;
    if (opts.search) {
      where.OR = [
        { seller: { storeName: { contains: opts.search, mode: 'insensitive' } } },
        { seller: { user: { firstName: { contains: opts.search, mode: 'insensitive' } } } },
        { seller: { user: { lastName: { contains: opts.search, mode: 'insensitive' } } } },
        { seller: { user: { email: { contains: opts.search, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.sellerSubscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        include: {
          plan: { select: { name: true, currency: true, billingCycle: true, price: true } },
          seller: {
            select: {
              id: true, storeName: true,
              user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            },
          },
        },
      }),
      this.prisma.sellerSubscription.count({ where }),
    ]);
    return { items, total, page: opts.page, limit: opts.limit };
  }

  async adminGetAuditLog(subscriptionId: string) {
    return this.prisma.subscriptionAuditLog.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  /**
   * Manually extend a subscription by N days. Used for support cases ("seller paid
   * offline, please activate"), VIP overrides, and grace recovery.
   * - Advances `expiresAt` by `days` from MAX(now, current expiresAt).
   * - Clears `graceUntil` if set; forces `status = ACTIVE`.
   * - Writes an EXTEND audit row.
   */
  async adminExtend(
    subscriptionId: string,
    actorUserId: string,
    dto: { days: number; reason: string },
  ) {
    if (!dto?.days || dto.days <= 0) throw new BadRequestException('days must be a positive number');
    if (!dto?.reason?.trim()) throw new BadRequestException('reason is required for audit');

    const sub = await this.prisma.sellerSubscription.findUnique({ where: { id: subscriptionId } });
    if (!sub) throw new NotFoundException('Subscription not found');

    const now = new Date();
    const base = sub.expiresAt && sub.expiresAt > now ? sub.expiresAt : now;
    const newExpiresAt = new Date(base.getTime() + dto.days * 86_400_000);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sellerSubscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'ACTIVE',
          expiresAt: newExpiresAt,
          graceUntil: null,
          startedAt: sub.startedAt ?? now,
        },
        include: { plan: true, seller: { select: { storeName: true } } },
      });
      await tx.subscriptionAuditLog.create({
        data: {
          subscriptionId,
          actorUserId,
          action: 'EXTEND',
          payload: {
            days: dto.days,
            reason: dto.reason,
            oldStatus: sub.status,
            oldExpiresAt: sub.expiresAt?.toISOString() ?? null,
            newExpiresAt: newExpiresAt.toISOString(),
          },
        },
      });
      return updated;
    });
  }

  /**
   * Admin cancels a subscription. Sets `status = CANCELLED`, records reason in
   * the audit log. Does NOT immediately revoke premium features — the plan-limit
   * enforcement reads ACTIVE/GRACE, so CANCELLED disqualifies on next product
   * create. Use adminExtend later to reverse if needed.
   */
  async adminCancel(subscriptionId: string, actorUserId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('reason is required for audit');

    const sub = await this.prisma.sellerSubscription.findUnique({ where: { id: subscriptionId } });
    if (!sub) throw new NotFoundException('Subscription not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sellerSubscription.update({
        where: { id: subscriptionId },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      await tx.subscriptionAuditLog.create({
        data: {
          subscriptionId,
          actorUserId,
          action: 'CANCEL',
          payload: {
            reason,
            oldStatus: sub.status,
            cancelledAt: updated.cancelledAt?.toISOString() ?? null,
          },
        },
      });
      return updated;
    });
  }

  private _calcExpiry(billingCycle: string): Date | undefined {
    const now = new Date();
    if (billingCycle === 'MONTHLY') {
      const d = new Date(now);
      d.setMonth(d.getMonth() + 1);
      return d;
    }
    if (billingCycle === 'YEARLY') {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() + 1);
      return d;
    }
    // ONCE = no expiry
    return undefined;
  }
}
