import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { DeliveryService } from './delivery.service';

@ApiTags('deliveries')
@Controller('deliveries')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeliveriesCompatController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post('assign')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  assign(@Body('orderId') orderId: string, @Body('riderId') riderId: string) {
    return this.deliveryService.assignRider(orderId, riderId);
  }

  @Post('update-status')
  updateStatus(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.deliveryService.updateStatus(dto, userId);
  }

  @Get(':orderId')
  getOne(@Param('orderId') orderId: string) {
    return this.deliveryService.getDelivery(orderId);
  }

  @Get(':orderId/tracking')
  getTracking(@Param('orderId') orderId: string) {
    return this.deliveryService.getTracking(orderId);
  }
}