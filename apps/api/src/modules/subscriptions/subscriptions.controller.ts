import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Req, Res, Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionReceiptsService } from './receipts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(
    private service: SubscriptionsService,
    private receipts: SubscriptionReceiptsService,
  ) {}

  // ── Plans (public listing + admin management) ─────────────────────────────────

  @Get('plans')
  @ApiOperation({ summary: 'List active subscription plans (public)' })
  listPlans() {
    return this.service.listPlans(false);
  }

  @Get('plans/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all plans including inactive (admin)' })
  listAllPlans() {
    return this.service.listPlans(true);
  }

  @Post('plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create subscription plan (admin)' })
  createPlan(@Body() dto: any) {
    return this.service.createPlan(dto);
  }

  @Patch('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update subscription plan (admin)' })
  updatePlan(@Param('id') id: string, @Body() dto: any) {
    return this.service.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete subscription plan (admin)' })
  deletePlan(@Param('id') id: string) {
    return this.service.deletePlan(id);
  }

  // ── Seller: Subscribe ─────────────────────────────────────────────────────────

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my current subscription' })
  getMy(@Req() req: any) {
    return this.service.getMySubscription(req.user.id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my subscription history' })
  getHistory(@Req() req: any) {
    return this.service.listSellerSubscriptions(req.user.id);
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to a plan — initiates Pesapal payment' })
  subscribe(@Req() req: any, @Body() dto: { planId: string; paymentMethod?: string }) {
    return this.service.subscribe(req.user.id, dto.planId, dto.paymentMethod);
  }

  /**
   * Download a PDF receipt for a paid subscription. Ownership-checked — only
   * the seller who owns the subscription can fetch it.
   */
  @Get(':id/receipt.pdf')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download subscription payment receipt (PDF)' })
  async downloadReceipt(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const userId = req.user?.id ?? req.user?.sub;
    const pdf = await this.receipts.generate(id, userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="totalstore-receipt-${id}.pdf"`);
    res.setHeader('Content-Length', String(pdf.length));
    res.end(pdf);
  }

  // ── Admin: Subscribers management ────────────────────────────────────────────

  @Get('admin/subscribers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List subscribers with filters (admin)' })
  adminListSubscribers(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.adminListSubscribers({
      status: status?.trim() || undefined,
      search: search?.trim() || undefined,
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 20, 100),
    });
  }

  @Get('admin/:id/audit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Audit log for a subscription (admin)' })
  adminGetAudit(@Param('id') id: string) {
    return this.service.adminGetAuditLog(id);
  }

  @Post('admin/:id/extend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually extend subscription by N days (admin)' })
  adminExtend(@Param('id') id: string, @Req() req: any, @Body() dto: { days: number; reason: string }) {
    const actorId = req.user?.id ?? req.user?.sub;
    return this.service.adminExtend(id, actorId, dto);
  }

  @Post('admin/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a subscription (admin)' })
  adminCancel(@Param('id') id: string, @Req() req: any, @Body() dto: { reason: string }) {
    const actorId = req.user?.id ?? req.user?.sub;
    return this.service.adminCancel(id, actorId, dto.reason);
  }

  /**
   * Pesapal redirects here after payment on the seller subscription flow.
   * Public — no JWT (Pesapal calls this from the browser redirect).
   */
  @Get('callback')
  @ApiOperation({ summary: 'Subscription payment callback — activates subscription' })
  async callback(
    @Query('subscriptionId') subscriptionId: string,
    @Query('OrderTrackingId') orderTrackingId: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Subscription callback: id=${subscriptionId}, trackingId=${orderTrackingId}`);
    let activated = false;
    if (subscriptionId) {
      try {
        const result = await this.service.activateSubscription(subscriptionId);
        activated = result.success;
      } catch (e: any) {
        this.logger.error(`Subscription activation failed: ${e.message}`);
      }
    }
    const webUrl = process.env.SELLER_WEB_URL || 'https://shop.saktech.org/seller';
    const redirectTo = `${webUrl}/subscription?status=${activated ? 'success' : 'pending'}`;
    res.redirect(302, redirectTo);
  }
}
