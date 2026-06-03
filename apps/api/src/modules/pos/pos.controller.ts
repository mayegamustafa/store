import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PosService } from './pos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { Feature } from '../../common/feature-guard/feature.decorator';
import { FeatureGuard } from '../../common/feature-guard/feature.guard';

@ApiTags('pos')
@ApiBearerAuth()
@UseGuards(FeatureGuard, JwtAuthGuard, RolesGuard)
@Feature('FEATURE_POS')
@Roles(Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN, Role.SELLER)
@Controller('pos')
export class PosController {
  constructor(private pos: PosService) {}

  // Sessions
  @Post('sessions')
  openSession(@Body() body: any) {
    return this.pos.openSession(body);
  }

  @Get('sessions')
  listSessions(@Query('page') page = 1, @Query('status') status?: string) {
    return this.pos.listSessions(+page, status);
  }

  @Get('sessions/:id')
  getSession(@Param('id') id: string) {
    return this.pos.getSession(id);
  }

  @Patch('sessions/:id/close')
  closeSession(@Param('id') id: string, @Body() body: { closingCash: number; notes?: string }) {
    return this.pos.closeSession(id, body.closingCash, body.notes);
  }

  // Transactions
  @Post('sessions/:id/transactions')
  createTransaction(@Param('id') sessionId: string, @Body() body: any) {
    return this.pos.createTransaction(sessionId, body);
  }

  @Get('transactions')
  listTransactions(@Query('page') page = 1, @Query('sessionId') sessionId?: string) {
    return this.pos.listTransactions(+page, sessionId);
  }

  @Get('transactions/:id')
  getTransaction(@Param('id') id: string) {
    return this.pos.getTransaction(id);
  }

  @Delete('transactions/:id/void')
  voidTransaction(@Param('id') id: string) {
    return this.pos.voidTransaction(id);
  }

  // Inventory
  @Get('inventory')
  getInventory(@Query('page') page = 1, @Query('search') search?: string, @Query('lowStock') lowStock?: boolean) {
    return this.pos.getInventory(+page, search, lowStock);
  }

  @Patch('inventory/:productId/stock')
  updateStock(@Param('productId') productId: string, @Body() body: { stock: number }) {
    return this.pos.updateStock(productId, body.stock);
  }

  @Patch('inventory/:productId/adjust')
  adjustStock(@Param('productId') productId: string, @Body() body: { delta: number; reason?: string }) {
    return this.pos.adjustStock(productId, body.delta, body.reason);
  }
}
