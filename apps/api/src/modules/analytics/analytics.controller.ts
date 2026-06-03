import {
  Controller, Post, Get, Body, Query,
  UseGuards, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';

class RecordVisitDto {
  @IsString() page: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() referrer?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() browser?: string;
  @IsOptional() @IsString() os?: string;
  @IsOptional() @IsString() device?: string;
}

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  // ── Public: record a visit ─────────────────────────────────────────────────
  @Post('visit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Record a page visit (called by web frontend)' })
  async recordVisit(@Body() dto: RecordVisitDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      undefined;
    return this.service.recordVisit({ ...dto, ip });
  }

  // ── Admin: stats/counts ────────────────────────────────────────────────────
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  getStats() {
    return this.service.getStats();
  }

  @Get('trend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  getTrend(@Query('days') days?: string) {
    return this.service.getTrend(days ? parseInt(days) : 7);
  }

  @Get('geo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  getGeo() {
    return this.service.getGeo();
  }

  @Get('cities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  getCities() {
    return this.service.getCities();
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  getDevices() {
    return this.service.getDevices();
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  getLogs(
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
    @Query('search') search?: string,
  ) {
    return this.service.getLogs(
      page  ? parseInt(page)  : 1,
      limit ? parseInt(limit) : 50,
      search || '',
    );
  }
}
