import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SellersService } from './sellers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('sellers')
@Controller('sellers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SellersController {
  constructor(
    private sellersService: SellersService,
    private prisma: PrismaService,
  ) {}

  @Post('onboard') onboard(@CurrentUser('id') id: string, @Body() dto: any) { return this.sellersService.onboard(id, dto); }
  @Get('me') getProfile(@CurrentUser('id') id: string) { return this.sellersService.getMyProfile(id); }
  @Patch('me') updateProfile(@CurrentUser('id') id: string, @Body() dto: any) { return this.sellersService.updateProfile(id, dto); }
  @Get('me/dashboard') getDashboard(@CurrentUser('id') id: string) { return this.sellersService.getDashboard(id); }
  @Get('me/orders') getOrders(
    @CurrentUser('id') id: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('status') status?: string,
  ) {
    return this.sellersService.getOrders(id, page, limit, status);
  }

  @Get('me/earnings') getEarnings(@CurrentUser('id') id: string) {
    return this.sellersService.getEarnings(id);
  }

  @Post('me/payout-request') requestPayout(@CurrentUser('id') id: string, @Body() dto: any) {
    return this.sellersService.requestPayout(id, dto.amount, dto.method, dto.accountNumber);
  }

  // Notification inbox
  @Get('me/notifications')
  async getNotifications(@CurrentUser('id') id: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    const l = Math.max(1, Math.min(100, +limit || 15));
    const p = Math.max(1, +page || 1);
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: l,
        skip: (p - 1) * l,
      }),
      this.prisma.notification.count({ where: { userId: id } }),
    ]);
    const unreadCount = await this.prisma.notification.count({ where: { userId: id, isRead: false } });
    return { data, meta: { total, page: p, limit: l, unreadCount } };
  }
  @Get('me/notifications/unread-count')
  async getUnreadCount(@CurrentUser('id') id: string) {
    const count = await this.prisma.notification.count({ where: { userId: id, isRead: false } });
    return { count };
  }
  @Patch('me/notifications/:notifId/read')
  markRead(@Param('notifId') notifId: string, @CurrentUser('id') id: string) {
    return this.prisma.notification.updateMany({
      where: { id: notifId, userId: id },
      data: { isRead: true, readAt: new Date() },
    });
  }
  @Post('me/notifications/mark-all-read')
  markAllRead(@CurrentUser('id') id: string) {
    return this.prisma.notification.updateMany({
      where: { userId: id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // Admin only — paginated list (alias used by admin panel)
  @Get('all')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  getAllPaginated(
    @Query('status') status: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.sellersService.getAllSellers(status, +page, +limit, search);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  getAll(@Query('status') status: any) { return this.sellersService.getAllSellers(status); }

  @Patch(':id/approve')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  approve(@Param('id') id: string) { return this.sellersService.approveSeller(id); }

  @Patch(':id/reject')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  reject(@Param('id') id: string, @Body('reason') reason: string) { return this.sellersService.rejectSeller(id, reason); }

  @Patch(':id/mark-official')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  markOfficial(@Param('id') id: string, @Body('isOfficial') isOfficial: boolean) {
    return this.sellersService.markOfficial(id, isOfficial);
  }

  @Patch(':id/suspend')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  suspend(@Param('id') id: string) { return this.sellersService.suspendSeller(id); }

  @Patch(':id/unsuspend')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  unsuspend(@Param('id') id: string) { return this.sellersService.unsuspendSeller(id); }
}
