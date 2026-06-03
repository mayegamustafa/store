import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';
import dayjs from 'dayjs';

/**
 * PDF receipt generator for a seller subscription payment.
 *
 * Pattern cloned from OrdersService.generateReceipt — same header/styling so
 * order receipts and subscription receipts look like they come from the same
 * platform. Branding is intentionally hardcoded ("TotalStore"); when admin-
 * editable branding is wanted across both surfaces, do them together.
 */
@Injectable()
export class SubscriptionReceiptsService {
  constructor(private prisma: PrismaService) {}

  async generate(subscriptionId: string, requestingUserId: string): Promise<Buffer> {
    const sub = await this.prisma.sellerSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: true,
        seller: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
        },
      },
    });
    if (!sub) throw new NotFoundException('Subscription not found');

    // Ownership: requesting user must own the SellerProfile.
    if (sub.seller.user.id !== requestingUserId) {
      throw new ForbiddenException('You do not own this subscription');
    }

    const isPaid = Number(sub.amount ?? 0) > 0;
    // Free-tier subs have no commercial receipt; refuse rather than render an empty one.
    if (!isPaid) throw new NotFoundException('No receipt available for free subscriptions');

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ───────────────────────────────────────────────────────────
      doc.fontSize(24).font('Helvetica-Bold').text('TotalStore', { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#666666').text('Subscription Receipt', { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown();

      // ── Subscription details ─────────────────────────────────────────────
      const currency = sub.plan.currency || 'UGX';
      const amount = Number(sub.amount ?? sub.plan.price ?? 0);

      doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold');
      doc.text(`Receipt #: ${sub.id}`);
      doc.font('Helvetica').fontSize(10).fillColor('#444444');
      doc.text(`Issued: ${dayjs(sub.startedAt ?? sub.createdAt).format('DD MMM YYYY, hh:mm A')}`);
      doc.text(`Status: ${sub.status}`);
      doc.text(`Payment: ${sub.paymentMethod || '—'}`);
      if (sub.paymentRef) doc.text(`Reference: ${sub.paymentRef}`);
      doc.moveDown();

      // ── Seller details ───────────────────────────────────────────────────
      const u = sub.seller.user;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text('Billed to:');
      doc.font('Helvetica').fontSize(10).fillColor('#444444');
      doc.text(sub.seller.storeName);
      const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
      if (name) doc.text(name);
      if (u.email) doc.text(u.email);
      if (u.phone) doc.text(u.phone);
      doc.moveDown();

      // ── Line item table ──────────────────────────────────────────────────
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.5);
      const tableTop = doc.y;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
      doc.text('Description', 50, tableTop, { width: 320 });
      doc.text('Cycle', 370, tableTop, { width: 80, align: 'center' });
      doc.text('Amount', 460, tableTop, { width: 85, align: 'right' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.3);

      const rowY = doc.y;
      doc.font('Helvetica').fontSize(10).fillColor('#333333');
      doc.text(`${sub.plan.name} subscription`, 50, rowY, { width: 320 });
      doc.text(sub.plan.billingCycle ?? '—', 370, rowY, { width: 80, align: 'center' });
      doc.text(`${currency} ${amount.toLocaleString()}`, 460, rowY, { width: 85, align: 'right' });
      doc.moveDown(0.8);

      // ── Total ────────────────────────────────────────────────────────────
      doc.moveTo(350, doc.y).lineTo(545, doc.y).strokeColor('#000000').stroke();
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000');
      const totalY = doc.y;
      doc.text('Total:', 370, totalY, { width: 80, align: 'right' });
      doc.text(`${currency} ${amount.toLocaleString()}`, 460, totalY, { width: 85, align: 'right' });
      doc.moveDown(2);

      // ── Footer ───────────────────────────────────────────────────────────
      doc.fontSize(9).fillColor('#888888').font('Helvetica');
      if (sub.expiresAt) {
        doc.text(`Plan period covers until ${dayjs(sub.expiresAt).format('DD MMM YYYY')}.`);
      }
      doc.moveDown(0.5);
      doc.text('Thank you for selling on TotalStore.', { align: 'center' });

      doc.end();
    });
  }
}
