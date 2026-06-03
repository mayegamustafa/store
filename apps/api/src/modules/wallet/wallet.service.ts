import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { WalletOwnerType } from './dto/wallet.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private prisma: PrismaService) {}

  // ── Buyer Wallet ────────────────────────────────────────────────────────────

  async getBuyerBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return { balance: Number(user.walletBalance) };
  }

  async getBuyerTransactions(userId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where: { userId } }),
    ]);
    return { data: data.map(this.formatTx), total, page, pages: Math.ceil(total / limit) };
  }

  async creditBuyer(userId: string, amount: number, description: string, reference?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: amount } },
      });
      const txn = await tx.walletTransaction.create({
        data: {
          userId,
          type: 'credit',
          amount: new Decimal(amount),
          balance: user.walletBalance,
          description,
          reference,
        },
      });
      this.logger.log(`Credited buyer ${userId} with ${amount}: ${description}`);
      return { balance: Number(user.walletBalance), transaction: this.formatTx(txn) };
    });
  }

  async debitBuyer(userId: string, amount: number, description: string, reference?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      if (Number(user.walletBalance) < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }
      const updated = await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: amount } },
      });
      const txn = await tx.walletTransaction.create({
        data: {
          userId,
          type: 'debit',
          amount: new Decimal(amount),
          balance: updated.walletBalance,
          description,
          reference,
        },
      });
      this.logger.log(`Debited buyer ${userId} with ${amount}: ${description}`);
      return { balance: Number(updated.walletBalance), transaction: this.formatTx(txn) };
    });
  }

  // ── Seller Wallet ───────────────────────────────────────────────────────────

  async getSellerBalance(sellerId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      select: { walletBalance: true },
    });
    if (!seller) throw new NotFoundException('Seller not found');
    return { balance: Number(seller.walletBalance) };
  }

  async getSellerTransactions(sellerId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.sellerWalletTransaction.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sellerWalletTransaction.count({ where: { sellerId } }),
    ]);
    return { data: data.map(this.formatTx), total, page, pages: Math.ceil(total / limit) };
  }

  async creditSeller(sellerId: string, amount: number, description: string, reference?: string) {
    return this.prisma.$transaction(async (tx) => {
      const seller = await tx.sellerProfile.update({
        where: { id: sellerId },
        data: { walletBalance: { increment: amount } },
      });
      const txn = await tx.sellerWalletTransaction.create({
        data: {
          sellerId,
          type: 'credit',
          amount: new Decimal(amount),
          balance: seller.walletBalance,
          description,
          reference,
        },
      });
      this.logger.log(`Credited seller ${sellerId} with ${amount}: ${description}`);
      return { balance: Number(seller.walletBalance), transaction: this.formatTx(txn) };
    });
  }

  async debitSeller(sellerId: string, amount: number, description: string, reference?: string) {
    return this.prisma.$transaction(async (tx) => {
      const seller = await tx.sellerProfile.findUnique({ where: { id: sellerId } });
      if (!seller) throw new NotFoundException('Seller not found');
      if (Number(seller.walletBalance) < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }
      const updated = await tx.sellerProfile.update({
        where: { id: sellerId },
        data: { walletBalance: { decrement: amount } },
      });
      const txn = await tx.sellerWalletTransaction.create({
        data: {
          sellerId,
          type: 'debit',
          amount: new Decimal(amount),
          balance: updated.walletBalance,
          description,
          reference,
        },
      });
      this.logger.log(`Debited seller ${sellerId} with ${amount}: ${description}`);
      return { balance: Number(updated.walletBalance), transaction: this.formatTx(txn) };
    });
  }

  // ── Rider Wallet ────────────────────────────────────────────────────────────

  async getRiderBalance(riderId: string) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { id: riderId },
      select: { walletBalance: true },
    });
    if (!rider) throw new NotFoundException('Rider not found');
    return { balance: Number(rider.walletBalance) };
  }

  async getRiderTransactions(riderId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.riderWalletTransaction.findMany({
        where: { riderId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.riderWalletTransaction.count({ where: { riderId } }),
    ]);
    return { data: data.map(this.formatTx), total, page, pages: Math.ceil(total / limit) };
  }

  async creditRider(riderId: string, amount: number, description: string, reference?: string) {
    return this.prisma.$transaction(async (tx) => {
      const rider = await tx.riderProfile.update({
        where: { id: riderId },
        data: { walletBalance: { increment: amount } },
      });
      const txn = await tx.riderWalletTransaction.create({
        data: {
          riderId,
          type: 'credit',
          amount: new Decimal(amount),
          balance: rider.walletBalance,
          description,
          reference,
        },
      });
      this.logger.log(`Credited rider ${riderId} with ${amount}: ${description}`);
      return { balance: Number(rider.walletBalance), transaction: this.formatTx(txn) };
    });
  }

  async debitRider(riderId: string, amount: number, description: string, reference?: string) {
    return this.prisma.$transaction(async (tx) => {
      const rider = await tx.riderProfile.findUnique({ where: { id: riderId } });
      if (!rider) throw new NotFoundException('Rider not found');
      if (Number(rider.walletBalance) < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }
      const updated = await tx.riderProfile.update({
        where: { id: riderId },
        data: { walletBalance: { decrement: amount } },
      });
      const txn = await tx.riderWalletTransaction.create({
        data: {
          riderId,
          type: 'debit',
          amount: new Decimal(amount),
          balance: updated.walletBalance,
          description,
          reference,
        },
      });
      this.logger.log(`Debited rider ${riderId} with ${amount}: ${description}`);
      return { balance: Number(updated.walletBalance), transaction: this.formatTx(txn) };
    });
  }

  // ── Admin: universal credit/debit ───────────────────────────────────────────

  async adminCredit(targetId: string, ownerType: WalletOwnerType, amount: number, description: string) {
    switch (ownerType) {
      case WalletOwnerType.BUYER:
        return this.creditBuyer(targetId, amount, description, 'admin-credit');
      case WalletOwnerType.SELLER:
        return this.creditSeller(targetId, amount, description, 'admin-credit');
      case WalletOwnerType.RIDER:
        return this.creditRider(targetId, amount, description, 'admin-credit');
    }
  }

  async adminDebit(targetId: string, ownerType: WalletOwnerType, amount: number, description: string) {
    switch (ownerType) {
      case WalletOwnerType.BUYER:
        return this.debitBuyer(targetId, amount, description, 'admin-debit');
      case WalletOwnerType.SELLER:
        return this.debitSeller(targetId, amount, description, 'admin-debit');
      case WalletOwnerType.RIDER:
        return this.debitRider(targetId, amount, description, 'admin-debit');
    }
  }

  // ── Admin: get any wallet overview ──────────────────────────────────────────

  async adminGetWallet(targetId: string, ownerType: WalletOwnerType) {
    switch (ownerType) {
      case WalletOwnerType.BUYER: {
        const [balance, txns] = await Promise.all([
          this.getBuyerBalance(targetId),
          this.getBuyerTransactions(targetId, 1, 50),
        ]);
        return { ...balance, transactions: txns.data, total: txns.total };
      }
      case WalletOwnerType.SELLER: {
        const [balance, txns] = await Promise.all([
          this.getSellerBalance(targetId),
          this.getSellerTransactions(targetId, 1, 50),
        ]);
        return { ...balance, transactions: txns.data, total: txns.total };
      }
      case WalletOwnerType.RIDER: {
        const [balance, txns] = await Promise.all([
          this.getRiderBalance(targetId),
          this.getRiderTransactions(targetId, 1, 50),
        ]);
        return { ...balance, transactions: txns.data, total: txns.total };
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private formatTx(txn: any) {
    return {
      id: txn.id,
      type: txn.type,
      amount: Number(txn.amount),
      balance: Number(txn.balance),
      description: txn.description,
      reference: txn.reference,
      createdAt: txn.createdAt,
    };
  }
}
