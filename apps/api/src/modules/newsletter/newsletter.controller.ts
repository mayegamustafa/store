import {
  Controller, Post, Get, Patch, Param, Body, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { NewsletterService } from './newsletter.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';

class SubscribeDto {
  @IsEmail() email: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() source?: string;
}

class CreateCampaignDto {
  @IsString() subject: string;
  @IsString() body: string;
  @IsOptional() @IsString() preview?: string;
  @IsOptional() @IsString() scheduledFor?: string;
}

@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly service: NewsletterService) {}

  // ── Public ─────────────────────────────────────────────────────────────────

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe to newsletter' })
  subscribe(@Body() dto: SubscribeDto) {
    return this.service.subscribe(dto.email, dto.name, dto.source);
  }

  @Get('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe via link in email' })
  async unsubscribePage(@Query('email') email: string) {
    if (!email) return { message: 'Email is required' };
    await this.service.unsubscribe(email).catch(() => null);
    return { message: 'You have been unsubscribed successfully.' };
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  @Get('subscribers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all subscribers (admin)' })
  listSubscribers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('active') active?: string,
  ) {
    return this.service.listSubscribers({
      page:   Number(page  ?? 1),
      limit:  Number(limit ?? 50),
      active: active !== undefined ? active === 'true' : undefined,
    });
  }

  @Get('campaigns')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  listCampaigns() {
    return this.service.listCampaigns();
  }

  @Post('campaigns')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  createCampaign(@Body() dto: CreateCampaignDto) {
    return this.service.createCampaign(dto);
  }

  @Patch('campaigns/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  updateCampaign(@Param('id') id: string, @Body() dto: Partial<CreateCampaignDto>) {
    return this.service.updateCampaign(id, dto);
  }

  @Post('campaigns/:id/send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  sendCampaign(@Param('id') id: string) {
    return this.service.sendCampaign(id);
  }
}
