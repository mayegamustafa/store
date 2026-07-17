import { Body, Controller, Get, Param, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { IsNumber, IsOptional, IsString } from 'class-validator';

class SubmitProofDto {
  @IsOptional() @IsString() otp?: string;
  @IsOptional() @IsString() proofPhotoUrl?: string;
  @IsOptional() @IsString() signatureUrl?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsNumber() accuracy?: number;
  @IsOptional() @IsString() note?: string;
}

@ApiTags('delivery')
@Controller('delivery')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeliveryController {
  constructor(private service: DeliveryService) {}

  @Get('orders/:orderId') getDelivery(@Param('orderId') id: string) { return this.service.getDelivery(id); }

  // Online riders sorted by distance from the pickup shop — admin sees all
  // orders; a seller may only query orders containing their items.
  @Get('orders/:orderId/nearby-riders')
  @ApiOperation({ summary: 'Nearby online riders for an order (admin or owning seller)' })
  nearbyRiders(@Param('orderId') orderId: string, @Req() req: any) {
    return this.service.getNearbyRiders(orderId, req.user?.id, req.user?.role);
  }

  @Post('orders/:orderId/assign')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  assign(@Param('orderId') orderId: string, @Body('riderId') riderId: string) {
    return this.service.assignRider(orderId, riderId);
  }

  // A seller assigns a rider to their own order (ownership enforced in service)
  @Post('orders/:orderId/seller-assign')
  @Roles(Role.SELLER)
  @UseGuards(RolesGuard)
  sellerAssign(@Param('orderId') orderId: string, @Body('riderId') riderId: string, @Req() req: any) {
    return this.service.assignRider(orderId, riderId, req.user?.id);
  }

  @Get('pending')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  getPending() { return this.service.getAllPendingDeliveries(); }

  @Get('orders/:orderId/tracking')
  @ApiOperation({
    summary: 'Tracking snapshot — used by buyer/seller mobile + web when socket is disconnected (polling fallback).',
  })
  async getTracking(@Param('orderId') orderId: string, @Req() req: any) {
    const userId: string = req.user?.id ?? req.user?.sub;
    const role: string = req.user?.role;
    const allowed = await this.service.canAccessTracking(orderId, userId, role);
    if (!allowed) throw new ForbiddenException('Access denied to this delivery tracking');
    return this.service.getTracking(orderId);
  }

  /**
   * Rider submits proof-of-delivery: photo URL (already uploaded), optional signature,
   * required OTP if the delivery had one issued, and current geo. Server marks the
   * delivery DELIVERED atomically and notifies the buyer.
   */
  @Post('deliveries/:id/proof')
  @Roles(Role.RIDER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Submit proof of delivery (rider only) — OTP/photo/signature/geo' })
  submitProof(@Param('id') deliveryId: string, @Req() req: any, @Body() dto: SubmitProofDto) {
    const userId: string = req.user?.id ?? req.user?.sub;
    return this.service.submitProof(deliveryId, userId, dto);
  }

  /**
   * Admin fleet snapshot for the dispatch / fleet map dashboard.
   */
  @Get('fleet')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List online riders with last location + active delivery (admin only)' })
  getFleet() {
    return this.service.getFleet();
  }
}
