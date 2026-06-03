import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TicketStatus, TicketPriority, TicketCategory } from '@prisma/client';
import * as dayjs from 'dayjs';
import * as crypto from 'crypto';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private config: ConfigService,
  ) {}

  private get supportEmail() {
    return this.config.get<string>('COMPANY_SUPPORT_EMAIL', 'support@totalstore.ug');
  }
  private get supportName() {
    return this.config.get<string>('COMPANY_NAME', 'TotalStore Support');
  }
  private get appUrl() {
    return this.config.get<string>('APP_URL', 'http://localhost:3001');
  }

  // ── Generate ticket number ─────────────────────────────────────────────────
  private genTicketNumber(): string {
    const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `TKT-${dayjs().format('YYYYMMDD')}-${rand}`;
  }

  // ── HTML helpers ───────────────────────────────────────────────────────────
  private html(title: string, body: string): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" bgcolor="#f1f5f9" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="600" bgcolor="#ffffff" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);">
      <tr><td bgcolor="#0EA5E9" align="center" style="padding:24px;">
        <h1 style="margin:0;color:#fff;font-size:20px;">🛍 TotalStore Support</h1>
        <p style="margin:4px 0 0;color:#e0f2fe;font-size:12px;">We're here to help</p>
      </td></tr>
      <tr><td style="padding:28px 32px 0;"><h2 style="margin:0;color:#0f172a;font-size:18px;">${title}</h2></td></tr>
      <tr><td style="padding:16px 32px 28px;color:#334155;font-size:15px;line-height:1.7;">${body}</td></tr>
      <tr><td bgcolor="#f8fafc" style="padding:20px 32px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
          © ${new Date().getFullYear()} TotalStore Uganda — <a href="mailto:${this.supportEmail}" style="color:#0EA5E9;">${this.supportEmail}</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
  }

  // ── Create Ticket (public — buyer or guest) ────────────────────────────────
  async createTicket(dto: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    body: string;
    category?: TicketCategory;
    orderId?: string;
    userId?: string;
  }) {
    const ticketNumber = this.genTicketNumber();

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        subject: dto.subject,
        category: dto.category ?? TicketCategory.OTHER,
        userId: dto.userId,
        orderId: dto.orderId,
        messages: {
          create: {
            senderName: dto.name,
            senderEmail: dto.email,
            body: dto.body,
            isStaff: false,
          },
        },
      },
      include: { messages: true },
    });

    // ── Notify buyer: ticket received ──────────────────────────────────────
    await this.notifications.sendEmail(
      dto.email,
      `[${ticketNumber}] We received your message — TotalStore Support`,
      this.html(
        `Ticket Received: ${dto.subject}`,
        `<p>Hi <strong>${dto.name}</strong>,</p>
         <p>Thanks for reaching out! We've received your support request and our team will get back to you within <strong>24 hours</strong>.</p>
         <p><strong>Ticket Number:</strong> ${ticketNumber}<br>
            <strong>Subject:</strong> ${dto.subject}<br>
            <strong>Category:</strong> ${dto.category ?? 'General'}</p>
         <p>You can reply to this email directly and your reply will be added to your ticket.</p>
         <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
         <p style="color:#64748b;font-size:13px;"><em>Your message:</em><br>${dto.body}</p>`,
      ),
    ).catch(() => null);

    // ── Notify company inbox: new ticket alert ─────────────────────────────
    await this.notifications.sendEmail(
      this.supportEmail,
      `🎫 New Support Ticket [${ticketNumber}] — ${dto.subject}`,
      this.html(
        `New Ticket: ${dto.subject}`,
        `<p><strong>From:</strong> ${dto.name} &lt;${dto.email}&gt;${dto.phone ? `<br><strong>Phone:</strong> ${dto.phone}` : ''}</p>
         <p><strong>Ticket:</strong> ${ticketNumber}<br>
            <strong>Category:</strong> ${dto.category ?? 'Other'}${dto.orderId ? `<br><strong>Order ID:</strong> ${dto.orderId}` : ''}</p>
         <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
         <p><em>Message:</em><br>${dto.body}</p>
         <p style="margin-top:24px;">
           <a href="${this.appUrl}/admin/support/${ticket.id}" style="background:#0EA5E9;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;display:inline-block;">
             View &amp; Reply in Admin
           </a>
         </p>`,
      ),
    ).catch(() => null);

    this.logger.log(`📨 Support ticket ${ticketNumber} created by ${dto.email}`);
    return ticket;
  }

  // ── Get Tickets (admin) ───────────────────────────────────────────────────
  async listTickets(opts: {
    page?: number;
    limit?: number;
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
    search?: string;
    assignedToId?: string;
  } = {}) {
    const { page = 1, limit = 20, status, priority, category, search, assignedToId } = opts;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assignedToId) where.assignedToId = assignedToId;
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          messages: { orderBy: { createdAt: 'asc' }, take: 1 },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ── Get Single Ticket (admin or owner) ────────────────────────────────────
  async getTicket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  // ── Staff Reply ────────────────────────────────────────────────────────────
  async staffReply(ticketId: string, dto: {
    body: string;
    staffName: string;
    staffId?: string;
    attachments?: string[];
  }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const msg = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderName: dto.staffName,
        senderEmail: this.supportEmail,
        senderId: dto.staffId,
        body: dto.body,
        isStaff: true,
        attachments: dto.attachments ?? [],
      },
    });

    // Move to IN_PROGRESS if still OPEN
    if (ticket.status === TicketStatus.OPEN) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.IN_PROGRESS },
      });
    }

    // Email buyer with reply
    await this.notifications.sendEmail(
      ticket.email,
      `Re: [${ticket.ticketNumber}] ${ticket.subject}`,
      this.html(
        `Reply from ${this.supportName}`,
        `<p>Hi <strong>${ticket.name}</strong>,</p>
         <p>${dto.body}</p>
         <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
         <p style="color:#64748b;font-size:13px;">
           This is a reply to your ticket <strong>${ticket.ticketNumber}</strong>.<br>
           You can reply to this email to continue the conversation.
         </p>`,
      ),
    ).catch(() => null);

    this.logger.log(`💬 Staff replied to ticket ${ticket.ticketNumber}`);
    return msg;
  }

  // ── Customer Reply ─────────────────────────────────────────────────────────
  async customerReply(ticketId: string, dto: {
    body: string;
    name?: string;
    email?: string;
    attachments?: string[];
  }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const msg = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderName: dto.name ?? ticket.name,
        senderEmail: dto.email ?? ticket.email,
        body: dto.body,
        isStaff: false,
        attachments: dto.attachments ?? [],
      },
    });

    // Reopen if resolved/waiting
    const reopenStatuses: string[] = [TicketStatus.RESOLVED, TicketStatus.WAITING_CUSTOMER];
    if (reopenStatuses.includes(ticket.status)) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.OPEN },
      });
    }

    // Notify company inbox
    await this.notifications.sendEmail(
      this.supportEmail,
      `Re: [${ticket.ticketNumber}] ${ticket.subject} — customer reply`,
      this.html(
        `Customer Reply: ${ticket.subject}`,
        `<p><strong>From:</strong> ${ticket.name} &lt;${ticket.email}&gt;</p>
         <p><strong>Ticket:</strong> ${ticket.ticketNumber}</p>
         <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
         <p>${dto.body}</p>
         <p style="margin-top:24px;">
           <a href="${this.appUrl}/admin/support/${ticket.id}" style="background:#0EA5E9;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600;display:inline-block;">
             View Ticket
           </a>
         </p>`,
      ),
    ).catch(() => null);

    return msg;
  }

  // ── Update ticket status / priority / assignment ──────────────────────────
  async updateTicket(id: string, dto: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedToId?: string;
    tags?: string[];
  }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const data: any = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.assignedToId !== undefined) data.assignedToId = dto.assignedToId;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.status === TicketStatus.RESOLVED) data.resolvedAt = new Date();
    if (dto.status === TicketStatus.CLOSED) data.closedAt = new Date();

    const updated = await this.prisma.supportTicket.update({ where: { id }, data });

    // Notify buyer of resolution
    if (dto.status === TicketStatus.RESOLVED) {
      await this.notifications.sendEmail(
        ticket.email,
        `[${ticket.ticketNumber}] Your support ticket has been resolved`,
        this.html(
          'Ticket Resolved ✅',
          `<p>Hi <strong>${ticket.name}</strong>,</p>
           <p>Your support ticket <strong>${ticket.ticketNumber}</strong> has been marked as resolved.</p>
           <p>If you're still having issues, please reply to this email and we'll reopen your ticket.</p>`,
        ),
      ).catch(() => null);
    }

    return updated;
  }

  // ── Stats (admin dashboard) ────────────────────────────────────────────────
  async getStats() {
    const [open, inProgress, waitingCustomer, resolved, totalToday] = await Promise.all([
      this.prisma.supportTicket.count({ where: { status: TicketStatus.OPEN } }),
      this.prisma.supportTicket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
      this.prisma.supportTicket.count({ where: { status: TicketStatus.WAITING_CUSTOMER } }),
      this.prisma.supportTicket.count({ where: { status: TicketStatus.RESOLVED } }),
      this.prisma.supportTicket.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
    ]);
    return { open, inProgress, waitingCustomer, resolved, totalToday };
  }
}
