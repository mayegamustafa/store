import { Controller, Get, Put, Patch, Post, Body, Query, Param, UseGuards, Request, DefaultValuePipe, ParseIntPipe, NotFoundException, Headers, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { createHash } from 'crypto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { DynamicSettingsService } from './dynamic-settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

// Default values returned when the DB has no record yet
const DEFAULTS: Record<string, string> = {
  SITE_NAME: 'TotalStore',
  SITE_TAGLINE: "Uganda's #1 Online Marketplace",
  SITE_LOGO_URL: '',
  SITE_FAVICON_URL: '',
  CURRENCY: 'UGX',
  PRIMARY_COLOR: '#0ea5e9',
  ACCENT_COLOR: '#f59e0b',
  FONT_FAMILY: 'Inter',
  FOOTER_COPYRIGHT: '© 2025 TotalStore. All rights reserved.',
  SOCIAL_FACEBOOK: '',
  SOCIAL_INSTAGRAM: '',
  SOCIAL_TIKTOK: '',
  SOCIAL_WHATSAPP: '',
  MAINTENANCE_MODE: 'false',
  PRODUCTS_PER_PAGE: '24',
  // App-specific branding — updatable from the admin panel
  BUYER_APP_LOGO_URL: '',
  RIDER_APP_LOGO_URL: '',
  SELLER_APP_LOGO_URL: '',
  BUYER_APP_SPLASH_COLOR: '#0ea5e9',
  RIDER_APP_SPLASH_COLOR: '#059669',
  SELLER_APP_SPLASH_COLOR: '#7c3aed',
  BUYER_APP_TAGLINE: "Uganda's favourite marketplace",
  RIDER_APP_TAGLINE: 'Delivering happiness across Uganda',
  SELLER_APP_TAGLINE: 'Your business, our platform',
};

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private prisma: PrismaService,
    private dynamicSettings: DynamicSettingsService,
  ) {}

  /** Public endpoint — no auth required. Returns safe site configuration. */
  @Get('public')
  @ApiOperation({ summary: 'Get public site settings (no secrets) — supports ETag/If-None-Match' })
  async getPublicSettings(
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res() res: Response,
  ) {
    const data = await this.dynamicSettings.getPublicSettings();
    return this._sendWithETag(res, data, ifNoneMatch);
  }

  /** Public endpoint — dynamic app configuration for mobile/web clients. */
  @Get('app-config')
  @ApiOperation({ summary: 'Get dynamic app config (API URLs, versions, maintenance) — supports ETag/If-None-Match' })
  async getAppConfig(
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res() res: Response,
  ) {
    const data = await this.dynamicSettings.getAppConfig();
    return this._sendWithETag(res, data, ifNoneMatch);
  }

  /**
   * Send a JSON response with a strong ETag computed from the body hash.
   * Honors `If-None-Match` and returns 304 when unchanged — meaningful bandwidth
   * win on mobile retries (settings rarely change but apps refetch on foreground).
   * Cache-Control: 60s public + must-revalidate so clients honor ETag round-trip.
   */
  private _sendWithETag(res: Response, data: unknown, ifNoneMatch?: string) {
    const body = JSON.stringify(data);
    const etag = `W/"${createHash('sha1').update(body).digest('hex')}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return res.status(HttpStatus.NOT_MODIFIED).end();
    }
    res.setHeader('Content-Type', 'application/json');
    return res.status(HttpStatus.OK).send(body);
  }

  /** Public endpoint — returns active home hero banner slides */
  @Get('banners/hero')
  async getHeroBanners() {
    const now = new Date();
    return this.prisma.banner.findMany({
      where: {
        placement: 'home_hero',
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Public endpoint — active brands for homepage Top Brands section */
  @Get('brands')
  async getPublicBrands() {
    return this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Public endpoint — home promo blocks by placement */
  @Get('home-blocks')
  async getPublicHomeBlocks(@Query('placement') placement?: string) {
    return this.prisma.homeBlock.findMany({
      where: { isActive: true, ...(placement ? { placement } : {}) },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Public endpoint — banners by placement */
  @Get('banners')
  async getPublicBanners(@Query('placement') placement?: string) {
    const now = new Date();
    return this.prisma.banner.findMany({
      where: {
        isActive: true,
        ...(placement ? { placement } : {}),
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Public endpoint — list approved seller shops */
  @Get('shops')
  async getPublicShops(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('sort') sort = 'default',
    @Query('storeCategory') storeCategory?: string,
    @Query('search') search?: string,
  ) {
    const take = Math.min(Number(limit) || 20, 50);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const where: any = { status: 'APPROVED' };
    if (storeCategory) where.storeCategory = storeCategory;
    if (search) {
      where.OR = [
        { storeName: { contains: search, mode: 'insensitive' } },
        { storeDescription: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.sellerProfile.findMany({
        where,
        orderBy: sort === 'rating' ? { rating: 'desc' } : { createdAt: 'desc' },
        take,
        skip,
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.sellerProfile.count({ where }),
    ]);
    return { data, meta: { total, page: Number(page), limit: take } };
  }

  /** Public endpoint — get a single shop by storeSlug */
  @Get('shops/:slug')
  async getShopBySlug(@Param('slug') slug: string) {
    const seller = await this.prisma.sellerProfile.findFirst({
      where: { storeSlug: slug, status: 'APPROVED' },
    });
    if (!seller) throw new NotFoundException('Shop not found');
    return seller;
  }

  // ── Admin Settings Management ─────────────────────────────────────────────

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all settings grouped (admin)' })
  async adminGetAllSettings() {
    return this.dynamicSettings.getAllGrouped();
  }

  @Put('admin/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update settings (admin)' })
  async adminBulkUpdate(
    @Body('settings') settings: { key: string; value: string }[],
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.dynamicSettings.bulkSet(settings, userId);
  }

  @Patch('admin/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a single setting (admin)' })
  async adminUpdateSetting(
    @Param('key') key: string,
    @Body('value') value: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.dynamicSettings.set(key, value, userId);
  }

  @Get('admin/audit-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get settings audit logs (admin)' })
  async adminGetAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.dynamicSettings.getAuditLogs(page, Math.min(limit, 100));
  }

  // ── Payment Gateway Config ────────────────────────────────────────────────

  @Get('admin/payment-gateways')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment gateway configurations (admin)' })
  async adminGetPaymentGateways() {
    return this.dynamicSettings.getPaymentGateways();
  }

  @Put('admin/payment-gateways/:provider')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update payment gateway configuration (admin)' })
  async adminUpdatePaymentGateway(
    @Param('provider') provider: string,
    @Body() body: { isEnabled?: boolean; isSandbox?: boolean; config?: Record<string, string>; commission?: number; metadata?: Record<string, any> },
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.dynamicSettings.upsertPaymentGateway(provider, body, userId);
  }
}
