import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class NewsletterService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ── Subscribe ─────────────────────────────────────────────────────────────
  async subscribe(email: string, name?: string, source = 'website') {
    const existing = await this.prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing) {
      if (!existing.isActive) {
        // Re-subscribe
        return this.prisma.newsletterSubscriber.update({
          where: { email },
          data: { isActive: true, unsubscribedAt: null, name: name ?? existing.name },
        });
      }
      throw new ConflictException('This email is already subscribed.');
    }
    const sub = await this.prisma.newsletterSubscriber.create({
      data: { email, name: name ?? null, source },
    });

    // Welcome email
    try {
      await this.notifications.sendEmail(
        email,
        `Welcome to TotalStore Newsletter!`,
        this._welcomeHtml(name ?? 'Valued Customer'),
      );
    } catch (_) { /* non-fatal */ }

    return sub;
  }

  // ── Unsubscribe ────────────────────────────────────────────────────────────
  async unsubscribe(email: string) {
    const sub = await this.prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (!sub) throw new NotFoundException('Subscriber not found');
    return this.prisma.newsletterSubscriber.update({
      where: { email },
      data: { isActive: false, unsubscribedAt: new Date() },
    });
  }

  // ── List subscribers (admin) ───────────────────────────────────────────────
  async listSubscribers(options?: { page?: number; limit?: number; active?: boolean }) {
    const page   = Math.max(1, parseInt(String(options?.page  ?? 1), 10) || 1);
    const limit  = Math.min(200, Math.max(1, parseInt(String(options?.limit ?? 50), 10) || 50));
    const skip   = (page - 1) * limit;
    const where  = options?.active !== undefined ? { isActive: options.active } : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.newsletterSubscriber.findMany({ where, skip, take: limit, orderBy: { subscribedAt: 'desc' } }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  // ── Campaigns ─────────────────────────────────────────────────────────────
  async createCampaign(dto: { subject: string; body: string; preview?: string; scheduledFor?: string }) {
    return this.prisma.emailCampaign.create({
      data: {
        subject:      dto.subject,
        body:         dto.body,
        preview:      dto.preview ?? null,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        status:       'draft',
      },
    });
  }

  async listCampaigns() {
    return this.prisma.emailCampaign.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getCampaign(id: string) {
    const c = await this.prisma.emailCampaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }

  async updateCampaign(id: string, dto: Partial<{ subject: string; body: string; preview: string; scheduledFor: string }>) {
    return this.prisma.emailCampaign.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.scheduledFor !== undefined ? { scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null } : {}),
      },
    });
  }

  // ── Send campaign to all active subscribers ────────────────────────────────
  async sendCampaign(id: string) {
    const campaign = await this.getCampaign(id);
    if (campaign.status === 'sent') throw new ConflictException('Campaign already sent');

    await this.prisma.emailCampaign.update({ where: { id }, data: { status: 'sending' } });

    const subscribers = await this.prisma.newsletterSubscriber.findMany({ where: { isActive: true } });
    let sent = 0;

    for (const sub of subscribers) {
      try {
        const html = this._wrapTemplate(campaign.subject, campaign.body, sub.email);
        await this.notifications.sendEmail(sub.email, campaign.subject, html);
        sent++;
      } catch (_) { /* continue on failure */ }
    }

    return this.prisma.emailCampaign.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date(), totalSent: sent },
    });
  }

  // ── HTML helpers ──────────────────────────────────────────────────────────
  private _welcomeHtml(name: string) {
    return `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#0ea5e9">Welcome to TotalStore! 🎉</h2>
        <p>Hi ${name},</p>
        <p>Thank you for subscribing to our newsletter. You'll be the first to know about:</p>
        <ul>
          <li>Flash sales and limited-time deals</li>
          <li>New product arrivals</li>
          <li>Exclusive subscriber-only discounts</li>
        </ul>
        <a href="${process.env.WEB_URL || 'http://localhost:3000'}/products"
           style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px">
          Shop Now
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          You can <a href="${process.env.WEB_URL || 'http://localhost:3000'}/unsubscribe?email=${encodeURIComponent('')}">unsubscribe</a> at any time.
        </p>
      </div>`;
  }

  private _wrapTemplate(subject: string, body: string, email: string) {
    return `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#0ea5e9">${subject}</h2>
        <div>${body}</div>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0" />
        <p style="color:#9ca3af;font-size:12px">
          You're receiving this because you subscribed at TotalStore.<br/>
          <a href="${process.env.WEB_URL || 'http://localhost:3000'}/unsubscribe?email=${encodeURIComponent(email)}">Unsubscribe</a>
        </p>
      </div>`;
  }
}
