import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../prisma/prisma.service';
import { DynamicSettingsService } from '../settings/dynamic-settings.service';
import { NotificationChannel, NotificationEventType } from '@prisma/client';

/**
 * Unified Notifications Service
 * ─────────────────────────────
 * Channels:
 *   📱 SMS         — Africa's Talking
 *   💬 WhatsApp    — Twilio WhatsApp Business API
 *   📧 Email       — SMTP / Nodemailer with HTML templates
 *   🔔 Push (FCM)  — Firebase Admin — proper high-priority popups
 *
 * All messages are rendered from DB templates (Handlebars-style {{variable}})
 * and logged to notification_logs for audit trail.
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private mailer: nodemailer.Transporter | null = null;
  private firebaseApp: admin.app.App | null = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private dynamicSettings: DynamicSettingsService,
  ) {}

  async onModuleInit() {
    await this._setupMailer();
    await this._setupFirebase();
  }

  private async _setupMailer() {
    const host = (await this.dynamicSettings.get('SMTP_HOST')) || this.config.get('SMTP_HOST', 'smtp.gmail.com');
    const port = parseInt((await this.dynamicSettings.get('SMTP_PORT')) || this.config.get('SMTP_PORT', '587'), 10);
    const user = (await this.dynamicSettings.get('SMTP_USER')) || this.config.get('SMTP_USER');
    const pass = (await this.dynamicSettings.get('SMTP_PASS')) || this.config.get('SMTP_PASS');
    if (!user || !pass) {
      this.logger.warn('SMTP not configured (SMTP_USER/SMTP_PASS empty) — emails disabled');
      this.mailer = null;
      return;
    }
    this.mailer = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      // Fail fast: never let a slow/unreachable SMTP server hold up a request
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  private async _setupFirebase() {
    try {
      // Read credentials from DB (admin panel) with fallback to env vars
      const projectId =
        (await this.dynamicSettings.get('FIREBASE_PROJECT_ID')) ||
        this.config.get('FIREBASE_PROJECT_ID');
      if (!projectId) { this.logger.warn('Firebase not configured — push disabled'); return; }

      let privateKey =
        (await this.dynamicSettings.get('FIREBASE_PRIVATE_KEY')) ||
        this.config.get('FIREBASE_PRIVATE_KEY') || '';
      // Railway/env gotchas: value sometimes arrives wrapped in quotes and/or
      // with literal \n instead of real newlines. Normalise both.
      privateKey = privateKey.trim();
      if ((privateKey.startsWith('"') && privateKey.endsWith('"')) ||
          (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');
      const clientEmail =
        (await this.dynamicSettings.get('FIREBASE_CLIENT_EMAIL')) ||
        this.config.get('FIREBASE_CLIENT_EMAIL');

      if (!privateKey || !clientEmail) {
        this.logger.warn('Firebase credentials incomplete — push disabled');
        return;
      }

      // Destroy stale app if credentials changed
      if (admin.apps.length) {
        await admin.apps[0]?.delete();
      }

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({ projectId, privateKey, clientEmail }),
      });
      this.logger.log(`🔥 Firebase initialized for project: ${projectId}`);
    } catch (e) {
      this.logger.warn(`Firebase init error — push disabled: ${e.message}`);
    }
  }

  /** Whether push is actually live (Firebase initialised). */
  get pushEnabled(): boolean {
    return this.firebaseApp != null;
  }

  // ── Template renderer ─────────────────────────────────────────────────────────

  private _render(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }

  private async _loadTemplate(
    event: NotificationEventType,
    channel: NotificationChannel,
    vars: Record<string, string>,
    fallbackBody?: string,
    fallbackSubject?: string,
  ): Promise<{ subject: string; body: string; templateId: string | null }> {
    const tpl = await this.prisma.notificationTemplate.findFirst({
      where: { event, channel, isActive: true },
    });
    return {
      subject: this._render(tpl?.subject ?? fallbackSubject ?? 'TotalStore', vars),
      body: this._render(tpl?.body ?? fallbackBody ?? '', vars),
      templateId: tpl?.id ?? null,
    };
  }

  // ── Notification log ──────────────────────────────────────────────────────────

  private async _log(
    channel: NotificationChannel,
    event: NotificationEventType,
    recipient: string,
    body: string,
    subject?: string,
    templateId?: string | null,
    status = 'SENT',
    error?: string,
  ) {
    try {
      await this.prisma.notificationLog.create({
        data: { channel, event, recipient, body, subject, templateId, status, error },
      });
    } catch (e) {
      this.logger.warn('Failed to write notification log');
    }
  }

  // ── SMS via Africa's Talking ──────────────────────────────────────────────────

  async sendSms(phone: string, message: string) {
    const apiKey = this.config.get('AT_API_KEY');
    const username = this.config.get('AT_USERNAME', 'sandbox');
    const senderId = this.config.get('AT_SENDER_ID', 'TotalStore');
    const baseUrl = username === 'sandbox'
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging';
    try {
      await axios.post(baseUrl,
        new URLSearchParams({ username, to: phone, message, from: senderId }),
        { headers: { apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      this.logger.log(`📱 SMS → ${phone}`);
    } catch (error) {
      this.logger.error(`SMS failed to ${phone}`, error?.response?.data ?? error.message);
    }
  }

  // ── WhatsApp via Twilio ───────────────────────────────────────────────────────

  async sendWhatsApp(phone: string, message: string) {
    const accountSid = this.config.get('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get('TWILIO_AUTH_TOKEN');
    const from = this.config.get('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886');
    if (!accountSid || !authToken) {
      this.logger.warn(`WhatsApp not configured — would send: ${message}`);
      return;
    }
    const to = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
    try {
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({ From: from, To: to, Body: message }),
        { auth: { username: accountSid, password: authToken }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      this.logger.log(`💬 WhatsApp → ${phone}`);
    } catch (error) {
      this.logger.error(`WhatsApp failed to ${phone}`, error?.response?.data ?? error.message);
    }
  }

  // ── Email via SMTP ────────────────────────────────────────────────────────────

  async sendEmail(to: string, subject: string, html: string) {
    if (!this.mailer) return; // SMTP not configured — skip instantly
    try {
      const fromName = (await this.dynamicSettings.get('SMTP_FROM_NAME')) || this.config.get('SMTP_FROM_NAME', 'TotalStore');
      const fromEmail = (await this.dynamicSettings.get('SMTP_FROM_EMAIL')) || this.config.get('SMTP_FROM_EMAIL', 'noreply@totalstore.ug');
      await this.mailer.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to, subject, html,
      });
      this.logger.log(`📧 Email → ${to}`);
    } catch (error) {
      this.logger.error(`Email failed to ${to}`, error.message);
    }
  }

  // ── Push via Firebase (high-priority popup) ───────────────────────────────────

  async sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    imageUrl?: string,
  ) {
    if (!this.firebaseApp || !fcmToken) return;
    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body, ...(imageUrl ? { imageUrl } : {}) },
        data: data ?? {},
        android: {
          priority: 'high',
          notification: {
            channelId: 'totalstore_high',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
            notificationCount: 1,
            ...(imageUrl ? { imageUrl } : {}),
          },
        },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: {
            aps: {
              alert: { title, body },
              sound: 'default',
              badge: 1,
              'interruption-level': 'active',
              'content-available': 1,
            },
          },
          ...(imageUrl ? { fcmOptions: { imageUrl } } : {}),
        },
      });
      this.logger.log(`🔔 Push → ${fcmToken.substring(0, 10)}...`);
    } catch (error) {
      this.logger.error('Push failed', error.message);
    }
  }

  async sendTopicNotification(topic: string, title: string, body: string, data?: Record<string, string>, imageUrl?: string) {
    if (!this.firebaseApp) return;
    try {
      await admin.messaging().send({
        topic,
        notification: { title, body, ...(imageUrl ? { imageUrl } : {}) },
        data: data ?? {},
        android: {
          priority: 'high',
          notification: {
            channelId: 'totalstore_high', // heads-up channel the apps register
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
            ...(imageUrl ? { imageUrl } : {}),
          },
        },
        apns: { headers: { 'apns-priority': '10' }, payload: { aps: { sound: 'default', 'content-available': 1 } }, ...(imageUrl ? { fcmOptions: { imageUrl } } : {}) },
      });
    } catch (error) {
      this.logger.error('Topic push failed', error.message);
    }
  }

  // ── Multi-channel dispatcher ──────────────────────────────────────────────────

  async sendToUser(
    userId: string,
    event: NotificationEventType,
    vars: Record<string, string>,
    options?: {
      channels?: NotificationChannel[];
      fallbackSms?: string;
      fallbackEmail?: string;
      emailSubject?: string;
      route?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, fcmToken: true, firstName: true },
    });
    if (!user) return;

    const channels = options?.channels ?? [NotificationChannel.SMS, NotificationChannel.PUSH, NotificationChannel.IN_APP];
    const enrichedVars = { buyer_name: user.firstName, ...vars };

    for (const channel of channels) {
      try {
        if (channel === NotificationChannel.SMS && user.phone) {
          const { body, templateId } = await this._loadTemplate(event, channel, enrichedVars, options?.fallbackSms);
          await this.sendSms(user.phone, body);
          await this._log(channel, event, user.phone, body, undefined, templateId);
        }
        if (channel === NotificationChannel.WHATSAPP && user.phone) {
          const { body, templateId } = await this._loadTemplate(event, channel, enrichedVars, options?.fallbackSms);
          await this.sendWhatsApp(user.phone, body);
          await this._log(channel, event, user.phone, body, undefined, templateId);
        }
        if (channel === NotificationChannel.EMAIL && user.email) {
          const { subject, body, templateId } = await this._loadTemplate(event, channel, enrichedVars, options?.fallbackEmail, options?.emailSubject);
          await this.sendEmail(user.email, subject, body);
          await this._log(channel, event, user.email, body, subject, templateId);
        }
        if (channel === NotificationChannel.PUSH && user.fcmToken) {
          const { subject: title, body, templateId } = await this._loadTemplate(event, channel, enrichedVars, options?.fallbackSms, 'TotalStore');
          await this.sendPushNotification(user.fcmToken, title, body,
            { event, ...(options?.route ? { route: options.route } : {}), ...vars },
          );
          await this._log(channel, event, user.fcmToken, body, title, templateId);
        }
        if (channel === NotificationChannel.IN_APP) {
          const { subject: title, body } = await this._loadTemplate(event, channel, enrichedVars, options?.fallbackSms, 'TotalStore');
          await this.prisma.notification.create({
            data: { userId, type: 'ORDER_UPDATE', title, body, data: vars as any },
          });
        }
      } catch (e) {
        this.logger.error(`Channel ${channel} failed for ${userId}`, e.message);
      }
    }
  }

  // ── Order lifecycle helpers ───────────────────────────────────────────────────

  async notifyOrderPlaced(userId: string, orderId: string, orderNumber: string, amount: string) {
    const vars = { order_number: orderNumber, order_id: orderId, amount };
    await this.sendToUser(userId, NotificationEventType.ORDER_PLACED, vars, {
      channels: [NotificationChannel.SMS, NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.IN_APP],
      fallbackSms: `TotalStore: Order #${orderNumber} placed! Amount: UGX ${amount}. Track at totalstore.ug`,
      fallbackEmail: this._emailHtml('Order Confirmed 🎉', `<p>Your order <strong>#${orderNumber}</strong> has been placed.</p><p>Amount: <strong>UGX ${amount}</strong></p>`),
      emailSubject: `Order #${orderNumber} Confirmed — TotalStore`,
      route: `/orders/${orderId}`,
    });
  }

  async notifyOrderConfirmed(userId: string, orderId: string, orderNumber: string) {
    await this.sendToUser(userId, NotificationEventType.ORDER_CONFIRMED, { order_number: orderNumber, order_id: orderId }, {
      channels: [NotificationChannel.SMS, NotificationChannel.PUSH, NotificationChannel.IN_APP],
      fallbackSms: `TotalStore: Order #${orderNumber} confirmed and being packed!`,
      route: `/orders/${orderId}`,
    });
  }

  async notifyOrderShipped(userId: string, orderId: string, orderNumber: string, riderName?: string) {
    const vars = { order_number: orderNumber, order_id: orderId, rider_name: riderName ?? 'your rider' };
    await this.sendToUser(userId, NotificationEventType.ORDER_SHIPPED, vars, {
      channels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.PUSH, NotificationChannel.IN_APP],
      fallbackSms: `TotalStore: Order #${orderNumber} is on the way with ${vars.rider_name}! Track live in the app.`,
      route: `/orders/${orderId}/track`,
    });
  }

  async notifyOutForDelivery(userId: string, orderId: string, orderNumber: string) {
    await this.sendToUser(userId, NotificationEventType.ORDER_OUT_FOR_DELIVERY, { order_number: orderNumber, order_id: orderId }, {
      channels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.PUSH, NotificationChannel.IN_APP],
      fallbackSms: `TotalStore: 🚴 Order #${orderNumber} is almost there! Open the app to see live location.`,
      route: `/orders/${orderId}/track`,
    });
  }

  async notifyOrderDelivered(userId: string, orderId: string, orderNumber: string) {
    await this.sendToUser(userId, NotificationEventType.ORDER_DELIVERED, { order_number: orderNumber, order_id: orderId }, {
      channels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.IN_APP],
      fallbackSms: `TotalStore: ✅ Order #${orderNumber} delivered! Please rate your experience.`,
      fallbackEmail: this._emailHtml('Delivered ✅', `<p>Your order <strong>#${orderNumber}</strong> was successfully delivered. Thank you!</p>`),
      emailSubject: `Order #${orderNumber} Delivered — TotalStore`,
      route: `/orders/${orderId}`,
    });
  }

  async notifyOrderCancelled(userId: string, orderId: string, orderNumber: string, reason?: string) {
    const reasonHtml = reason ? `<p><strong>Reason:</strong> ${reason}</p>` : '';
    await this.sendToUser(userId, NotificationEventType.ORDER_CANCELLED, { order_number: orderNumber, order_id: orderId, reason: reason ?? '' }, {
      channels: [NotificationChannel.SMS, NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.IN_APP],
      fallbackSms: `TotalStore: Order #${orderNumber} has been cancelled.${reason ? ` Reason: ${reason}` : ''} Contact support at support@totalstore.ug`,
      fallbackEmail: this._emailHtml('Order Cancelled', `<p>Your order <strong>#${orderNumber}</strong> has been cancelled.${reasonHtml}<p>If you have questions, reply to this email or contact <a href="mailto:support@totalstore.ug">support@totalstore.ug</a>.</p>`),
      emailSubject: `Order #${orderNumber} Cancelled — TotalStore`,
      route: `/orders/${orderId}`,
    });
  }

  async notifySellerNewOrder(sellerId: string, orderId: string, orderNumber: string, amount: string) {
    await this.sendToUser(sellerId, NotificationEventType.SELLER_ORDER_RECEIVED, { order_number: orderNumber, order_id: orderId, amount }, {
      channels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.PUSH, NotificationChannel.IN_APP],
      fallbackSms: `TotalStore Seller: New order #${orderNumber} (UGX ${amount}). Log in to confirm.`,
      route: `/orders/${orderId}`,
    });
  }

  async notifyRiderAssigned(riderId: string, orderId: string, orderNumber: string, pickupAddress: string) {
    await this.sendToUser(riderId, NotificationEventType.RIDER_ASSIGNED, { order_number: orderNumber, order_id: orderId, pickup_address: pickupAddress }, {
      channels: [NotificationChannel.SMS, NotificationChannel.PUSH],
      fallbackSms: `TotalStore Rider: New delivery #${orderNumber}. Pick up from: ${pickupAddress}`,
      route: `/deliveries/${orderId}`,
    });
  }

  async notifySellerPayout(sellerId: string, amount: string, reference: string) {
    await this.sendToUser(sellerId, NotificationEventType.SELLER_PAYOUT_SENT, { amount, reference }, {
      channels: [NotificationChannel.SMS, NotificationChannel.WHATSAPP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
      fallbackSms: `TotalStore: Payout of UGX ${amount} sent to your account. Ref: ${reference}`,
    });
  }

  // ── Template management ───────────────────────────────────────────────────────

  async getTemplates() {
    return this.prisma.notificationTemplate.findMany({ orderBy: { event: 'asc' } });
  }

  async getTemplate(id: string) {
    const t = await this.prisma.notificationTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async upsertTemplate(
    event: NotificationEventType,
    channel: NotificationChannel,
    data: { name?: string; subject?: string; body: string; variables?: string[] },
  ) {
    return this.prisma.notificationTemplate.upsert({
      where: { event_channel: { event, channel } },
      create: { name: data.name ?? `${event}_${channel}`, event, channel, subject: data.subject, body: data.body, variables: data.variables ?? [] },
      update: { subject: data.subject, body: data.body, ...(data.variables ? { variables: data.variables } : {}) },
    });
  }

  async updateTemplate(id: string, data: Partial<{ subject: string; body: string; variables: string[]; isActive: boolean }>) {
    return this.prisma.notificationTemplate.update({ where: { id }, data });
  }

  async getNotificationLogs(page = 1, limit = 50, channel?: NotificationChannel, event?: NotificationEventType) {
    const skip = (page - 1) * limit;
    const where: any = { ...(channel ? { channel } : {}), ...(event ? { event } : {}) };
    const [total, data] = await Promise.all([
      this.prisma.notificationLog.count({ where }),
      this.prisma.notificationLog.findMany({ where, skip, take: limit, orderBy: { sentAt: 'desc' } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async testSendSms(phone: string, message: string) {
    await this.sendSms(phone, message);
    await this._log(NotificationChannel.SMS, NotificationEventType.CUSTOM, phone, message);
    return { sent: true };
  }

  async testSendWhatsApp(phone: string, message: string) {
    await this.sendWhatsApp(phone, message);
    await this._log(NotificationChannel.WHATSAPP, NotificationEventType.CUSTOM, phone, message);
    return { sent: true };
  }

  async testSendEmail(to: string, subject: string, body: string) {
    await this.sendEmail(to, subject, body);
    await this._log(NotificationChannel.EMAIL, NotificationEventType.CUSTOM, to, body, subject);
    return { sent: true };
  }

  async testSendPush(fcmToken: string, title: string, body: string) {
    await this.sendPushNotification(fcmToken, title, body);
    await this._log(NotificationChannel.PUSH, NotificationEventType.CUSTOM, fcmToken, body, title);
    return { sent: true };
  }

  // ── Broadcast / bulk notifications ────────────────────────────────────────────

  /**
   * Broadcast a push notification to a group of users via FCM topics.
   * Topics automatically created: `all_users`, `buyers`, `riders`, `sellers`.
   * Devices subscribe to relevant topics in the Flutter app's NotificationService.
   */
  async broadcast(options: {
    target: 'ALL' | 'BUYERS' | 'RIDERS' | 'SELLERS';
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
    route?: string;
  }) {
    const topicMap = {
      ALL: 'all_users',
      BUYERS: 'buyers',
      RIDERS: 'riders',
      SELLERS: 'sellers',
    };
    const topic = topicMap[options.target];
    const data = {
      ...(options.data ?? {}),
      ...(options.route ? { route: options.route } : {}),
      ...(options.imageUrl ? { imageUrl: options.imageUrl } : {}),
      title: options.title,
      body: options.body,
    };

    await this.sendTopicNotification(topic, options.title, options.body, data, options.imageUrl);
    await this._log(
      NotificationChannel.PUSH,
      NotificationEventType.CUSTOM,
      `topic:${topic}`,
      options.body,
      options.title,
    );
    return { sent: this.pushEnabled, topic, pushEnabled: this.pushEnabled };
  }

  /**
   * Send a custom push notification to a specific user by userId.
   */
  async sendCustomToUser(options: {
    userId: string;
    title: string;
    body: string;
    channels: NotificationChannel[];
    data?: Record<string, string>;
    route?: string;
    imageUrl?: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: options.userId },
      select: { phone: true, email: true, fcmToken: true, firstName: true },
    });
    if (!user) throw new Error('User not found');

    const results: Record<string, boolean> = {};

    for (const channel of options.channels) {
      try {
        if (channel === NotificationChannel.PUSH && user.fcmToken) {
          await this.sendPushNotification(user.fcmToken, options.title, options.body, {
            ...(options.data ?? {}),
            ...(options.route ? { route: options.route } : {}),
          }, options.imageUrl);
          await this._log(channel, NotificationEventType.CUSTOM, user.fcmToken, options.body, options.title);
          results.push = true;
        }
        if (channel === NotificationChannel.SMS && user.phone) {
          const msg = `${options.title}: ${options.body}`;
          await this.sendSms(user.phone, msg);
          await this._log(channel, NotificationEventType.CUSTOM, user.phone, msg);
          results.sms = true;
        }
        if (channel === NotificationChannel.WHATSAPP && user.phone) {
          const msg = `*${options.title}*\n${options.body}`;
          await this.sendWhatsApp(user.phone, msg);
          await this._log(channel, NotificationEventType.CUSTOM, user.phone, msg);
          results.whatsapp = true;
        }
        if (channel === NotificationChannel.EMAIL && user.email) {
          await this.sendEmail(user.email, options.title, this._emailHtml(options.title, options.body));
          await this._log(channel, NotificationEventType.CUSTOM, user.email, options.body, options.title);
          results.email = true;
        }
        if (channel === NotificationChannel.IN_APP) {
          await this.prisma.notification.create({
            data: { userId: options.userId, type: 'SYSTEM', title: options.title, body: options.body, data: options.data as any },
          });
          results.inApp = true;
        }
      } catch (e) {
        this.logger.error(`Broadcast channel ${channel} failed for user ${options.userId}`, e.message);
      }
    }

    return { sent: true, results };
  }

  // ── HTML Email wrapper ────────────────────────────────────────────────────────

  private _emailHtml(title: string, content: string): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" bgcolor="#f1f5f9" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" bgcolor="#ffffff" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);">
        <tr><td bgcolor="#0EA5E9" align="center" style="padding:28px;">
          <h1 style="margin:0;color:#fff;font-size:22px;">🛍 TotalStore</h1>
          <p style="margin:6px 0 0;color:#e0f2fe;font-size:13px;">Uganda's Favourite Marketplace</p>
        </td></tr>
        <tr><td style="padding:28px 32px 0;"><h2 style="margin:0;color:#0f172a;font-size:20px;">${title}</h2></td></tr>
        <tr><td style="padding:16px 32px 28px;color:#334155;font-size:15px;line-height:1.6;">${content}</td></tr>
        <tr><td align="center" style="padding:0 32px 28px;">
          <a href="https://totalstore.ug" style="background:#0EA5E9;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">Open TotalStore</a>
        </td></tr>
        <tr><td bgcolor="#f8fafc" style="padding:20px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">© ${new Date().getFullYear()} TotalStore Uganda</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }
}
