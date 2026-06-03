import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Res, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsArray, IsNumber, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Response } from 'express';

class OrderItemDto {
  @ApiProperty() @IsString() productId: string;
  @ApiProperty() @IsInt() @Min(1) quantity: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() variantId?: string;
}

class CreateOrderDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() addressId?: string;
  @ApiProperty() @IsEnum(['MTN_MOMO', 'AIRTEL_MONEY', 'PESAPAL', 'STRIPE', 'FLUTTERWAVE', 'CASH_ON_DELIVERY', 'WALLET']) paymentMethod: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() couponCode?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
  @ApiProperty({ required: false, type: [OrderItemDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items?: OrderItemDto[];
}

class UpdateStatusDto {
  @ApiProperty({ enum: OrderStatus }) @IsEnum(OrderStatus) status: OrderStatus;
  @ApiProperty({ required: false }) @IsString() @IsOptional() note?: string;
}

class CancelOrderDto {
  @ApiProperty() @IsString() reason: string;
}

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create order from cart' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.createFromCart(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my orders (buyer)' })
  getMyOrders(
    @CurrentUser('id') userId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.ordersService.getBuyerOrders(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.findOne(id, userId, role);
  }

  @Get(':id/tracking')
  @ApiOperation({ summary: 'Get live order tracking details' })
  tracking(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.getTracking(id, userId, role);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Download order receipt as PDF' })
  async getReceipt(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.ordersService.generateReceipt(id, userId, role);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${id.slice(0, 8)}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(id, userId, dto.reason);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status (seller/admin)' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto.status, dto.note, userId);
  }

  @Get('track-by-number/:orderNumber')
  @ApiOperation({ summary: 'Track order by order number (public-ish)' })
  trackByNumber(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.trackByOrderNumber(orderNumber, userId);
  }

  @Post(':id/returns')
  @ApiOperation({ summary: 'Request a return/refund for an order' })
  requestReturn(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.ordersService.createReturnRequest(id, userId, dto);
  }
}
