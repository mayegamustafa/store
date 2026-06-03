import {
  Controller, Get, Post, Body, Query, Req, UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { WalletService } from './wallet.service';
import { TopUpDto, WithdrawDto, AdminCreditDto, AdminDebitDto, WalletOwnerType } from './dto/wallet.dto';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(
    private wallet: WalletService,
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
  @ApiOperation({ summary: 'Request withdrawal from seller wallet' })
  async sellerWithdraw(@Req() req: any, @Body() dto: WithdrawDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!seller) return { error: 'No seller profile found' };
    return this.wallet.debitSeller(
      seller.id,
      dto.amount,
      `Withdrawal request (${dto.method})`,
      `withdraw-${Date.now()}`,
    );
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
  @ApiOperation({ summary: 'Request withdrawal from rider wallet' })
  async riderWithdraw(@Req() req: any, @Body() dto: WithdrawDto) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!rider) return { error: 'No rider profile found' };
    return this.wallet.debitRider(
      rider.id,
      dto.amount,
      `Withdrawal request (${dto.method})`,
      `withdraw-${Date.now()}`,
    );
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
}
