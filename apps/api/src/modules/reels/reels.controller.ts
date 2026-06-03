import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReelsService } from './reels.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { Feature } from '../../common/feature-guard/feature.decorator';
import { FeatureGuard } from '../../common/feature-guard/feature.guard';

@ApiTags('reels')
@Controller('reels')
@UseGuards(FeatureGuard)
@Feature('FEATURE_REELS')
export class ReelsController {
  constructor(private reels: ReelsService) {}

  // Public: get feed
  @Get()
  findAll(@Query('page') page = 1, @Query('search') search?: string, @Query('sellerId') sellerId?: string) {
    return this.reels.findAll(+page, search, sellerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reels.findOne(id);
  }

  @Patch(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  like(@Param('id') id: string) {
    return this.reels.like(id);
  }

  // Admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @Get('admin/all')
  adminAll(@Query('page') page = 1, @Query('search') search?: string) {
    return this.reels.adminFindAll(+page, search);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SELLER)
  @ApiBearerAuth()
  @Post()
  create(@Body() body: any) {
    return this.reels.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SELLER)
  @ApiBearerAuth()
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.reels.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reels.remove(id);
  }
}
