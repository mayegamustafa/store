import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private cartService: CartService) {}

  @Get() getCart(@CurrentUser('id') id: string) { return this.cartService.getCart(id); }
  @Post('items') addItem(@CurrentUser('id') id: string, @Body() dto: any) { return this.cartService.addItem(id, dto); }
  @Patch('items/:itemId') updateItem(@Param('itemId') itemId: string, @Body('quantity') qty: number) { return this.cartService.updateItem(itemId, qty); }
  @Delete('items/:itemId') removeItem(@Param('itemId') itemId: string) { return this.cartService.removeItem(itemId); }
  @Delete('clear') clearCart(@CurrentUser('id') id: string) { return this.cartService.clearCart(id); }
}
