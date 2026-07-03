import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from './wallet.service';
import { WalletOwnerType } from './dto/wallet.dto';

export interface PayoutRequestInput {
  ownerType: WalletOwnerType;
  ownerId: string; // User.id (BUYER) / SellerProfile.id / RiderProfile.id
  amount: number;
  method: 'mobile_money' | 'bank';
  destination: string; // phone number or bank account number
  destinationName?: string;
  bankName?: string;
}

/**
 * Withdrawal lifecycle:
 *
 *   request()  — debits the wallet (race-safe) and creates a PENDING payout
 *                with the destination account captured
 *   approve()  — admin marks the payout COMPLETED with the mobile-money/bank
 *                transaction reference (manual disbursement for now; provider
 *                disbursement APIs can be slotted in behind this call later)
 *   reject()   — admin declines; the wallet is refunded automatically
 */
@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  async request(input: PayoutRequestInput) {
    const { ownerType, ownerId, amount, method, destination, destinationName, bankName } = input;
    if (!destination?.trim()) {
      throw new BadRequestException('A destination (mobile money number or bank account) is required');
    }
    if (method === 'bank' && !bankName?.trim()) {
      throw new BadRequestException('Bank name is required for bank withdrawals');
    }

    // Debit first (atomic, throws on insufficient balance)
    const description = `Withdrawal to ${method === 'bank' ? `${bankName} ${destination}` : destination}`;
    switch (ownerType) {
      case WalletOwnerType.BUYER:
        await this.walletService.debitBuyer(ownerId, amount, description, 'payout-request');
        break;
      case WalletOwnerType.SELLER:
        await this.walletService.debitSeller(ownerId, amount, description, 'payout-request');
        break;
      case WalletOwnerType.RIDER:
        await this.walletService.debitRider(ownerId, amount, description, 'payout-request');
        break;
    }

    const payout = await this.prisma.payout.create({
      data: {
        ownerType,
        ownerId,
        sellerId: ownerType === WalletOwnerType.SELLER ? ownerId : null,
        amount: new Decimal(amount),
        method,
        destination: destination.trim(),
        destinationName: destinationName?.trim() || null,
        bankName: bankName?.trim() || null,
      },
    });
    this.logger.log(`Payout requested: ${amount} to ${destination} (${ownerType} ${ownerId})`);
    return this.format(payout);
  }

  async listForOwner(ownerType: WalletOwnerType, ownerId: string, page = 1, limit = 20) {
    const where = { ownerType, ownerId };
    const [data, total] = await Promise.all([
      this.prisma.payout.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.payout.count({ where }),
    ]);
    return { data: data.map((p) => this.format(p)), total, page, pages: Math.ceil(total / limit) };
  }

  async adminList(status?: string, page = 1, limit = 20) {
    const where = status ? { status: status as any } : {};
    const [data, total] = await Promise.all([
      this.prisma.payout.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.payout.count({ where }),
    ]);
    // Attach a display name for the admin queue
    const enriched = await Promise.all(data.map(async (p) => ({ ...this.format(p), owner: await this.ownerLabel(p.ownerType, p.ownerId) })));
    return { data: enriched, total, page, pages: Math.ceil(total / limit) };
  }

  async approve(payoutId: string, reference?: string) {
    // PENDING → COMPLETED, atomically, so double-clicks can't double-process
    const claimed = await this.prisma.payout.updateMany({
      where: { id: payoutId, status: 'PENDING' },
      data: { status: 'COMPLETED', reference: reference || null, processedAt: new Date() },
    });
    if (claimed.count === 0) {
      const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
      if (!payout) throw new NotFoundException('Payout not found');
      throw new BadRequestException(`Payout is already ${payout.status}`);
    }
    this.logger.log(`Payout ${payoutId} approved (ref: ${reference || 'n/a'})`);
    return this.prisma.payout.findUnique({ where: { id: payoutId } }).then((p) => this.format(p!));
  }

  async reject(payoutId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('A rejection reason is required');
    const claimed = await this.prisma.payout.updateMany({
      where: { id: payoutId, status: 'PENDING' },
      data: { status: 'FAILED', failReason: reason.trim(), processedAt: new Date() },
    });
    if (claimed.count === 0) {
      const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
      if (!payout) throw new NotFoundException('Payout not found');
      throw new BadRequestException(`Payout is already ${payout.status}`);
    }

    // Refund the wallet
    const payout = await this.prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
    const amount = Number(payout.amount);
    const description = `Withdrawal rejected: ${reason.trim()}`;
    const ownerId = payout.ownerId || payout.sellerId!;
    switch (payout.ownerType as WalletOwnerType) {
      case WalletOwnerType.BUYER:
        await this.walletService.creditBuyer(ownerId, amount, description, `payout-refund-${payoutId}`);
        break;
      case WalletOwnerType.SELLER:
        await this.walletService.creditSeller(ownerId, amount, description, `payout-refund-${payoutId}`);
        break;
      case WalletOwnerType.RIDER:
        await this.walletService.creditRider(ownerId, amount, description, `payout-refund-${payoutId}`);
        break;
    }
    this.logger.log(`Payout ${payoutId} rejected and refunded: ${reason}`);
    return this.format(payout);
  }

  private async ownerLabel(ownerType: string, ownerId: string | null): Promise<string> {
    if (!ownerId) return 'Unknown';
    try {
      if (ownerType === 'SELLER') {
        const s = await this.prisma.sellerProfile.findUnique({ where: { id: ownerId }, select: { storeName: true } });
        return s?.storeName || ownerId;
      }
      if (ownerType === 'RIDER') {
        const r = await this.prisma.riderProfile.findUnique({ where: { id: ownerId }, include: { user: { select: { firstName: true, lastName: true, phone: true } } } });
        return r ? [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') || r.user.phone || ownerId : ownerId;
      }
      const u = await this.prisma.user.findUnique({ where: { id: ownerId }, select: { firstName: true, lastName: true, email: true, phone: true } });
      return u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.phone || ownerId : ownerId;
    } catch {
      return ownerId;
    }
  }

  private format(p: any) {
    return {
      id: p.id,
      ownerType: p.ownerType,
      ownerId: p.ownerId ?? p.sellerId,
      amount: Number(p.amount),
      currency: p.currency,
      method: p.method,
      destination: p.destination,
      destinationName: p.destinationName,
      bankName: p.bankName,
      status: p.status,
      reference: p.reference,
      failReason: p.failReason,
      processedAt: p.processedAt,
      createdAt: p.createdAt,
    };
  }
}
