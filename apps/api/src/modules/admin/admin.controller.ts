import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  // Dashboard
  @Get('dashboard') getDashboard() { return this.adminService.getDashboardStats(); }

  // Orders
  @Get('orders') getOrders(@Query('page') page: number, @Query('limit') limit: number, @Query('status') status: string) {
    return this.adminService.getAllOrders(page, limit, status);
  }

  // Reports
  @Get('reports/revenue') getRevenue(@Query('from') from: string, @Query('to') to: string) {
    return this.adminService.getRevenueReport(new Date(from), new Date(to));
  }

  @Get('reports/top-products') getTopProducts(@Query('limit') limit: number) {
    return this.adminService.getTopSellingProducts(limit);
  }

  // Banners (admin CRUD)
  @Get('banners') getBanners() { return this.adminService.manageBanners(); }
  @Post('banners') createBanner(@Body() dto: any) { return this.adminService.createBanner(dto); }
  @Patch('banners/:id') updateBanner(@Param('id') id: string, @Body() dto: any) { return this.adminService.updateBanner(id, dto); }
  @Delete('banners/:id') deleteBanner(@Param('id') id: string) { return this.adminService.deleteBanner(id); }

  // Brands (admin CRUD)
  @Get('brands') getBrands() { return this.adminService.manageBrands(); }
  @Post('brands') createBrand(@Body() dto: any) { return this.adminService.createBrand(dto); }
  @Patch('brands/:id') updateBrand(@Param('id') id: string, @Body() dto: any) { return this.adminService.updateBrand(id, dto); }
  @Delete('brands/:id') deleteBrand(@Param('id') id: string) { return this.adminService.deleteBrand(id); }

  // Home Blocks (admin CRUD)
  @Get('home-blocks') getHomeBlocks() { return this.adminService.manageHomeBlocks(); }
  @Post('home-blocks') createHomeBlock(@Body() dto: any) { return this.adminService.createHomeBlock(dto); }
  @Patch('home-blocks/:id') updateHomeBlock(@Param('id') id: string, @Body() dto: any) { return this.adminService.updateHomeBlock(id, dto); }
  @Delete('home-blocks/:id') deleteHomeBlock(@Param('id') id: string) { return this.adminService.deleteHomeBlock(id); }

  // Settings
  @Get('settings') getSettings() { return this.adminService.getSettings(); }
  @Put('settings/bulk') bulkUpsertSettings(@Body('settings') settings: { key: string; value: string }[]) {
    return this.adminService.bulkUpsertSettings(settings);
  }
  @Patch('settings/:key') upsertSetting(@Param('key') key: string, @Body('value') value: string) { return this.adminService.upsertSetting(key, value); }

  // Manual seller creation
  @Post('sellers/create') createSeller(@Body() dto: any) { return this.adminService.createSellerManually(dto); }

  // Notification inbox for logged-in admin/staff
  @Get('inbox') getInbox(@Request() req: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getUserInboxNotifications(req.user.sub || req.user.id, +page, +limit);
  }
  @Get('inbox/unread-count') getUnreadCount(@Request() req: any) {
    return this.adminService.getUserUnreadCount(req.user.sub || req.user.id);
  }
  @Patch('inbox/:id/read') markRead(@Param('id') id: string, @Request() req: any) {
    return this.adminService.markNotificationRead(id, req.user.sub || req.user.id);
  }
  @Post('inbox/mark-all-read') markAllRead(@Request() req: any) {
    return this.adminService.markAllNotificationsRead(req.user.sub || req.user.id);
  }
}
