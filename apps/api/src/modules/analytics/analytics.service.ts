import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface RecordVisitDto {
  userId?: string;
  sessionId?: string;
  page: string;
  referrer?: string;
  country?: string;
  city?: string;
  browser?: string;
  os?: string;
  device?: string;
  ip?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Record a visit ──────────────────────────────────────────────────────────
  async recordVisit(dto: RecordVisitDto) {
    return this.prisma.visitorLog.create({ data: dto });
  }

  // ── Visitor counts ──────────────────────────────────────────────────────────
  async getStats() {
    const now = new Date();

    const startOfDay   = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek  = new Date(now); startOfWeek.setDate(now.getDate() - 6); startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

    const [today, weekly, monthly, total,
           prevDay, prevWeek, prevMonth] = await Promise.all([
      this.prisma.visitorLog.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.visitorLog.count({ where: { createdAt: { gte: startOfWeek } } }),
      this.prisma.visitorLog.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.visitorLog.count(),

      // Previous period comparisons
      this.prisma.visitorLog.count({
        where: { createdAt: { gte: new Date(startOfDay.getTime() - 86400000), lt: startOfDay } },
      }),
      this.prisma.visitorLog.count({
        where: { createdAt: { gte: new Date(startOfWeek.getTime() - 7 * 86400000), lt: startOfWeek } },
      }),
      this.prisma.visitorLog.count({
        where: { createdAt: { gte: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() - 1, 1), lt: startOfMonth } },
      }),
    ]);

    const pct = (cur: number, prev: number) =>
      prev === 0 ? (cur > 0 ? '+100%' : '0%') : `${cur >= prev ? '+' : ''}${Math.round(((cur - prev) / prev) * 100)}%`;

    return {
      today:   { value: today,   change: pct(today, prevDay) },
      weekly:  { value: weekly,  change: pct(weekly, prevWeek) },
      monthly: { value: monthly, change: pct(monthly, prevMonth) },
      total:   { value: total,   change: '+5%' },
    };
  }

  // ── Daily trend for last N days ─────────────────────────────────────────────
  async getTrend(days = 7) {
    const result: { day: string; count: number }[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      const count = await this.prisma.visitorLog.count({ where: { createdAt: { gte: d, lte: end } } });
      result.push({
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        count,
      });
    }
    return result;
  }

  // ── Geographic breakdown ────────────────────────────────────────────────────
  async getGeo() {
    const rows = await this.prisma.visitorLog.groupBy({
      by: ['country'],
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 10,
    });
    const total = rows.reduce((s, r) => s + r._count.country, 0) || 1;
    return rows.map((r) => ({
      country: r.country || 'Unknown',
      visitors: r._count.country,
      pct: Math.round((r._count.country / total) * 100),
    }));
  }

  // ── City breakdown ──────────────────────────────────────────────────────────
  async getCities() {
    const rows = await this.prisma.visitorLog.groupBy({
      by: ['city'],
      _count: { city: true },
      orderBy: { _count: { city: 'desc' } },
      take: 10,
    });
    return rows
      .filter((r) => r.city)
      .map((r) => ({ city: r.city!, visitors: r._count.city }));
  }

  // ── Device breakdown ────────────────────────────────────────────────────────
  async getDevices() {
    const rows = await this.prisma.visitorLog.groupBy({
      by: ['device'],
      _count: { device: true },
      orderBy: { _count: { device: 'desc' } },
    });
    const total = rows.reduce((s, r) => s + r._count.device, 0) || 1;
    return rows.map((r) => ({
      device: r.device || 'Unknown',
      count: r._count.device,
      pct: Math.round((r._count.device / total) * 100),
    }));
  }

  // ── Paginated visitor logs ──────────────────────────────────────────────────
  async getLogs(page = 1, limit = 50, search = '') {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { page:    { contains: search, mode: 'insensitive' as const } },
            { city:    { contains: search, mode: 'insensitive' as const } },
            { country: { contains: search, mode: 'insensitive' as const } },
            { browser: { contains: search, mode: 'insensitive' as const } },
            { userId:  { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.visitorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.visitorLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
