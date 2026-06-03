import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

function generateReceiptNo() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = randomBytes(3).toString('hex').toUpperCase();
  return `POS-${date}-${rand}`;
}

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);
  constructor(private prisma: PrismaService) {}

  // ── Sessions ──────────────────────────────────────────────────────────────
  async openSession(data: { staffId?: string; sellerId?: string; openingCash: number }) {
    return this.prisma.posSession.create({ data: { ...data, openingCash: data.openingCash } });
  }

  async closeSession(id: string, closingCash: number, notes?: string) {
    const session = await this.prisma.posSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    return this.prisma.posSession.update({
      where: { id },
      data: { closedAt: new Date(), closingCash, notes, status: 'CLOSED' },
    });
  }

  async getSession(id: string) {
    return this.prisma.posSession.findUnique({
      where: { id },
      include: { transactions: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async listSessions(page = 1, status?: string) {
    const take = 20;
    const skip = (page - 1) * take;
    const where: any = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.posSession.findMany({ where, skip, take, orderBy: { openedAt: 'desc' }, include: { _count: { select: { transactions: true } } } }),
      this.prisma.posSession.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / take) };
  }

  // ── Transactions ───────────────────────────────────────────────────────────
  async createTransaction(sessionId: string, data: any) {
    const session = await this.prisma.posSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status === 'CLOSED') throw new NotFoundException('Active session not found');

    const receiptNo = generateReceiptNo();

    // Deduct stock for each item
    for (const item of data.items) {
      if (item.productId) {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty }, totalSold: { increment: item.qty } },
        }).catch((err) => this.logger.warn(`Stock decrement failed for product ${item.productId}: ${err.message}`)); // ignore if product not found
      }
    }

    const txn = await this.prisma.posTransaction.create({
      data: { sessionId, receiptNo, ...data },
    });

    await this.prisma.posSession.update({
      where: { id: sessionId },
      data: {
        totalSales: { increment: data.total },
        totalTxns: { increment: 1 },
      },
    });

    return { ...txn, receiptNo };
  }

  async getTransaction(id: string) {
    return this.prisma.posTransaction.findUnique({ where: { id } });
  }

  async listTransactions(page = 1, sessionId?: string) {
    const take = 30;
    const skip = (page - 1) * take;
    const where: any = sessionId ? { sessionId } : {};
    const [items, total] = await Promise.all([
      this.prisma.posTransaction.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.posTransaction.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / take) };
  }

  async voidTransaction(id: string) {
    const txn = await this.prisma.posTransaction.findUnique({ where: { id } });
    if (!txn) throw new NotFoundException('Transaction not found');
    // Restore stock
    for (const item of txn.items as any[]) {
      if (item.productId) {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.qty }, totalSold: { decrement: item.qty } },
        }).catch((err) => this.logger.warn(`Stock restore failed for product ${item.productId}: ${err.message}`));
      }
    }
    await this.prisma.posSession.update({
      where: { id: txn.sessionId },
      data: {
        totalSales: { decrement: txn.total as any },
        totalTxns: { decrement: 1 },
      },
    });
    return this.prisma.posTransaction.delete({ where: { id } });
  }

  // ── Inventory ──────────────────────────────────────────────────────────────
  async getInventory(page = 1, search?: string, lowStock?: boolean) {
    const take = 50;
    const skip = (page - 1) * take;
    const where: any = {};
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
    if (lowStock) where.stock = { lte: 10 };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        select: { id: true, name: true, sku: true, barcode: true, stock: true, lowStockAlert: true, basePrice: true, images: true, thumbnailUrl: true, status: true, seller: { select: { storeName: true } }, category: { select: { name: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Fuzzy fallback when too few exact results
    if (search && items.length < 3) {
      try {
        const fuzzyRows = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT p.id FROM products p WHERE similarity(p.name, $1) > 0.1 ORDER BY similarity(p.name, $1) DESC LIMIT ${take}`,
          search,
        );
        const existingIds = new Set(items.map((i) => i.id));
        const newIds = fuzzyRows.map((r) => r.id).filter((id) => !existingIds.has(id));
        if (newIds.length > 0) {
          const extra = await this.prisma.product.findMany({
            where: { id: { in: newIds } },
            select: { id: true, name: true, sku: true, barcode: true, stock: true, lowStockAlert: true, basePrice: true, images: true, thumbnailUrl: true, status: true, seller: { select: { storeName: true } }, category: { select: { name: true } } },
          });
          items.push(...extra);
        }
      } catch {
        // pg_trgm not available
      }
    }

    return { items, total: Math.max(total, items.length), page, totalPages: Math.ceil(Math.max(total, items.length) / take) };
  }

  async updateStock(productId: string, stock: number) {
    return this.prisma.product.update({ where: { id: productId }, data: { stock } });
  }

  async adjustStock(productId: string, delta: number, reason?: string) {
    return this.prisma.product.update({
      where: { id: productId },
      data: { stock: { increment: delta } },
    });
  }
}
