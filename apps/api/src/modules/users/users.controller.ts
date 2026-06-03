import { Controller, Get, Patch, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me') getProfile(@CurrentUser('id') id: string) { return this.usersService.findById(id); }
  @Patch('me') updateProfile(@CurrentUser('id') id: string, @Body() dto: any) { return this.usersService.updateProfile(id, dto); }
  @Get('me/addresses') getAddresses(@CurrentUser('id') id: string) { return this.usersService.getAddresses(id); }
  @Post('me/addresses') addAddress(@CurrentUser('id') id: string, @Body() dto: any) { return this.usersService.addAddress(id, dto); }
  @Patch('me/addresses/:id') updateAddress(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: any) { return this.usersService.updateAddress(id, userId, dto); }
  @Patch('me/addresses/:id/default') setDefaultAddress(@Param('id') id: string, @CurrentUser('id') userId: string) { return this.usersService.setDefaultAddress(id, userId); }
  @Delete('me/addresses/:id') deleteAddress(@Param('id') id: string, @CurrentUser('id') userId: string) { return this.usersService.deleteAddress(id, userId); }

  // ── Wishlist ──────────────────────────────────────────────────────────────
  @Get('me/wishlist') getWishlist(@CurrentUser('id') id: string) { return this.usersService.getWishlist(id); }
  @Post('me/wishlist') addToWishlist(@CurrentUser('id') id: string, @Body('productId') productId: string) { return this.usersService.addToWishlist(id, productId); }
  @Delete('me/wishlist/:productId') removeFromWishlist(@Param('productId') productId: string, @CurrentUser('id') id: string) { return this.usersService.removeFromWishlist(id, productId); }

  // ── Admin user management ──────────────────────────────────────────────────
  @Get('admin/list')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  listUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.adminListUsers(page, limit, search, status);
  }

  @Patch('admin/:id/suspend')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  suspendUser(@Param('id') id: string) { return this.usersService.adminSuspendUser(id); }

  @Patch('admin/:id/unsuspend')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  unsuspendUser(@Param('id') id: string) { return this.usersService.adminUnsuspendUser(id); }

  @Delete('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  deleteUser(@Param('id') id: string) { return this.usersService.adminDeleteUser(id); }

  // ── Notifications ──────────────────────────────────────────────────────────
  @Get('me/notifications')
  getNotifications(
    @CurrentUser('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) { return this.usersService.getNotifications(id, page, limit); }

  @Patch('me/notifications/:notifId/read')
  markRead(
    @Param('notifId') notifId: string,
    @CurrentUser('id') userId: string,
  ) { return this.usersService.markNotificationRead(notifId, userId); }

  @Patch('me/notifications/read-all')
  markAllRead(@CurrentUser('id') id: string) { return this.usersService.markAllNotificationsRead(id); }
}
