import {
  Controller, Get, Post, Body, Query, Req, UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { WalletService } from './wallet.service';
import { EscrowService } from './escrow.service';
import { PayoutsService } from './payouts.service';
import {
  TopUpDto, WithdrawDto, AdminCreditDto, AdminDebitDto, WalletOwnerType,
  ApprovePayoutDto, RejectPayoutDto,
} from './dto/wallet.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Param } from '@nestjs/common';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(
    private wallet: WalletService,
    private escrow: EscrowService,
    private payouts: PayoutsService,
    private prisma: PrismaService,
  ) {}

  // ── Buyer Endpoints ─────────────────────────────────────────────────────────

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my wallet balance (buyer)' })
  getBalance(@Req() req: any) {
    return this.wallet.getBuyerBalance(req.user.id);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my wallet transactions (buyer)' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  getTransactions(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.wallet.getBuyerTransactions(req.user.id, page, Math.min(limit, 50));
  }

  @Post('topup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Top up wallet via MoMo/Airtel' })
  async topUp(@Req() req: any, @Body() dto: TopUpDto) {
    // In production, this would initiate a MoMo/Airtel collection
    // and credit the wallet on successful callback.
    // For now, we credit immediately (sandbox mode).
    return this.wallet.creditBuyer(
      req.user.id,
      dto.amount,
      `Wallet top-up via ${dto.method}`,
      `topup-${Date.now()}`,
    );
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request withdrawal from buyer wallet to mobile money / bank' })
  buyerWithdraw(@Req() req: any, @Body() dto: WithdrawDto) {
    return this.payouts.request({
      ownerType: WalletOwnerType.BUYER,
      ownerId: req.user.id,
      amount: dto.amount,
      method: dto.method,
      destination: dto.destination || dto.phone || '',
      destinationName: dto.destinationName,
      bankName: dto.bankName,
    });
  }

  @Get('withdrawals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My withdrawal history (buyer)' })
  buyerWithdrawals(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.payouts.listForOwner(WalletOwnerType.BUYER, req.user.id, page);
  }

  // ── Seller Endpoints ────────────────────────────────────────────────────────

  @Get('seller/balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my wallet balance (seller)' })
  async getSellerBalance(@Req() req: any) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!seller) return { balance: 0 };
    return this.wallet.getSellerBalance(seller.id);
  }

  @Get('seller/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my wallet transactions (seller)' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  async getSellerTransactions(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!seller) return { data: [], total: 0, page: 1, pages: 0 };
    return this.wallet.getSellerTransactions(seller.id, page, Math.min(limit, 50));
  }

  @Post('seller/withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request withdrawal from seller wallet to mobile money / bank' })
  async sellerWithdraw(@Req() req: any, @Body() dto: WithdrawDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!seller) return { error: 'No seller profile found' };
    return this.payouts.request({
      ownerType: WalletOwnerType.SELLER,
      ownerId: seller.id,
      amount: dto.amount,
      method: dto.method,
      destination: dto.destination || dto.phone || '',
      destinationName: dto.destinationName,
      bankName: dto.bankName,
    });
  }

  @Get('seller/withdrawals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My withdrawal history (seller)' })
  async sellerWithdrawals(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!seller) return { data: [], total: 0, page: 1, pages: 0 };
    return this.payouts.listForOwner(WalletOwnerType.SELLER, seller.id, page);
  }

  @Get('seller/escrow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My escrowed (pending) earnings (seller)' })
  async sellerEscrow(@Req() req: any) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!seller) return { pendingBalance: 0, holds: [] };
    return this.escrow.getSellerEscrow(seller.id);
  }

  // ── Rider Endpoints ─────────────────────────────────────────────────────────

  @Get('rider/balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my wallet balance (rider)' })
  async getRiderBalance(@Req() req: any) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!rider) return { balance: 0 };
    return this.wallet.getRiderBalance(rider.id);
  }

  @Get('rider/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my wallet transactions (rider)' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  async getRiderTransactions(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!rider) return { data: [], total: 0, page: 1, pages: 0 };
    return this.wallet.getRiderTransactions(rider.id, page, Math.min(limit, 50));
  }

  @Post('rider/withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request withdrawal from rider wallet to mobile money / bank' })
  async riderWithdraw(@Req() req: any, @Body() dto: WithdrawDto) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!rider) return { error: 'No rider profile found' };
    return this.payouts.request({
      ownerType: WalletOwnerType.RIDER,
      ownerId: rider.id,
      amount: dto.amount,
      method: dto.method,
      destination: dto.destination || dto.phone || '',
      destinationName: dto.destinationName,
      bankName: dto.bankName,
    });
  }

  @Get('rider/withdrawals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My withdrawal history (rider)' })
  async riderWithdrawals(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!rider) return { data: [], total: 0, page: 1, pages: 0 };
    return this.payouts.listForOwner(WalletOwnerType.RIDER, rider.id, page);
  }

  // ── Admin Endpoints ─────────────────────────────────────────────────────────

  @Get('admin/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet overview for any user (admin)' })
  @ApiQuery({ name: 'targetId' }) @ApiQuery({ name: 'ownerType', enum: WalletOwnerType })
  adminGetWallet(
    @Query('targetId') targetId: string,
    @Query('ownerType') ownerType: WalletOwnerType,
  ) {
    return this.wallet.adminGetWallet(targetId, ownerType);
  }

  @Post('admin/credit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Credit any user/seller/rider wallet (admin)' })
  adminCredit(@Body() dto: AdminCreditDto) {
    return this.wallet.adminCredit(dto.targetId, dto.ownerType, dto.amount, dto.description);
  }

  @Post('admin/debit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Debit any user/seller/rider wallet (admin)' })
  adminDebit(@Body() dto: AdminDebitDto) {
    return this.wallet.adminDebit(dto.targetId, dto.ownerType, dto.amount, dto.description);
  }

  // ── Admin: payout queue ─────────────────────────────────────────────────────

  @Get('admin/payouts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List withdrawal requests (admin)' })
  @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'page', required: false })
  adminPayouts(
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
  ) {
    return this.payouts.adminList(status, page);
  }

  @Post('admin/payouts/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a payout after disbursing the money (admin)' })
  approvePayout(@Param('id') id: string, @Body() dto: ApprovePayoutDto) {
    return this.payouts.approve(id, dto.reference);
  }

  @Post('admin/payouts/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a payout — refunds the wallet (admin)' })
  rejectPayout(@Param('id') id: string, @Body() dto: RejectPayoutDto) {
    return this.payouts.reject(id, dto.reason);
  }

  // ── Admin: platform revenue ─────────────────────────────────────────────────

  @Get('admin/platform-revenue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Platform commission/fee ledger with totals (admin)' })
  @ApiQuery({ name: 'page', required: false })
  async platformRevenue(@Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1) {
    const limit = 50;
    const [entries, total, sum] = await Promise.all([
      this.prisma.platformLedgerEntry.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.platformLedgerEntry.count(),
      this.prisma.platformLedgerEntry.aggregate({ _sum: { amount: true } }),
    ]);
    return {
      totalRevenue: Number(sum._sum.amount ?? 0),
      entries: entries.map((e) => ({ ...e, amount: Number(e.amount) })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }
}
