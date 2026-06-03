import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FlashSalesService } from './flash-sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('flash-sales')
@Controller('flash-sales')
export class FlashSalesController {
  constructor(private service: FlashSalesService) {}

  @Get('active') getActive() { return this.service.getActive(); }

  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN, Role.SUPER_ADMIN) @ApiBearerAuth()
  create(@Body() dto: any) { return this.service.create(dto); }

  @Patch(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN, Role.SUPER_ADMIN) @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }

  @Delete(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN, Role.SUPER_ADMIN) @ApiBearerAuth()
  delete(@Param('id') id: string) { return this.service.delete(id); }
}
