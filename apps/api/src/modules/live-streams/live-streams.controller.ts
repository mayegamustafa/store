import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LiveStreamsService } from './live-streams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Feature } from '../../common/feature-guard/feature.decorator';
import { FeatureGuard } from '../../common/feature-guard/feature.guard';

@ApiTags('live-streams')
@Controller('live-streams')
@UseGuards(FeatureGuard)
@Feature('FEATURE_LIVE_STREAMS')
export class LiveStreamsController {
  constructor(private streams: LiveStreamsService) {}

  @Get()
  findAll(@Query('page') page = 1, @Query('status') status?: string, @Query('sellerId') sellerId?: string) {
    return this.streams.findAll(+page, status, sellerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.streams.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/all')
  adminAll(@Query('page') page = 1, @Query('search') search?: string, @Query('status') status?: string) {
    return this.streams.adminFindAll(+page, search, status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.SELLER, Role.ADMIN, Role.SUPER_ADMIN)
  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.streams.create(user, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.SELLER, Role.ADMIN, Role.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.streams.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.SELLER, Role.ADMIN, Role.SUPER_ADMIN)
  @Patch(':id/start')
  start(@Param('id') id: string) {
    return this.streams.startStream(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.SELLER, Role.ADMIN, Role.SUPER_ADMIN)
  @Patch(':id/end')
  end(@Param('id') id: string) {
    return this.streams.endStream(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.streams.remove(id);
  }
}
