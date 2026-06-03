import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RidersService } from './riders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('riders')
@Controller('riders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RidersController {
  constructor(private ridersService: RidersService) {}

  @Post('register') register(@CurrentUser('id') id: string, @Body() dto: any) { return this.ridersService.register(id, dto); }
  @Get('me') getProfile(@CurrentUser('id') id: string) { return this.ridersService.getMyProfile(id); }
  @Patch('me/online') setOnline(@CurrentUser('id') id: string, @Body('isOnline') isOnline: boolean) { return this.ridersService.setOnlineStatus(id, isOnline); }
  @Get('me/deliveries') getDeliveries(@CurrentUser('id') id: string) { return this.ridersService.getAssignedDeliveries(id); }
  @Patch('deliveries/:id/status') updateDelivery(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.ridersService.updateDeliveryStatus(id, userId, dto);
  }
  @Get('me/earnings') getEarnings(@CurrentUser('id') id: string) { return this.ridersService.getEarnings(id); }
  @Post('location') updateLocation(@CurrentUser('id') id: string, @Body() dto: any) { return this.ridersService.updateLocation(id, dto); }

  @Get('all')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  getAllAlias(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.ridersService.getAllRiders({ page: +page, limit: +limit, status, search });
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.ridersService.getAllRiders({ page: +page, limit: +limit, status, search });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  getOne(@Param('id') id: string) { return this.ridersService.getRiderById(id); }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  updateStatus(@Param('id') id: string, @Body('status') status?: string) {
    if (!status) throw new BadRequestException('status is required');
    return this.ridersService.updateRiderStatus(id, status);
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  approve(@Param('id') id: string) { return this.ridersService.approveRider(id); }

  @Patch(':id/reject')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  reject(@Param('id') id: string, @Body('reason') reason?: string) { return this.ridersService.rejectRider(id, reason); }

  @Patch(':id/suspend')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  suspend(@Param('id') id: string) { return this.ridersService.suspendRider(id); }

  @Patch(':id/unsuspend')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  unsuspend(@Param('id') id: string) { return this.ridersService.unsuspendRider(id); }

  @Post('admin-create')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  adminCreate(@Body() dto: any) { return this.ridersService.adminCreateRider(dto); }
}
