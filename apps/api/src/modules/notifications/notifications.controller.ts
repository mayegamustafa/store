import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role, NotificationChannel, NotificationEventType } from '@prisma/client';

@ApiTags('notifications')
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private notifs: NotificationsService) {}

  // ── Templates ─────────────────────────────────────────────────────────────────

  @Get('templates')
  @ApiOperation({ summary: 'List all notification templates' })
  getTemplates() {
    return this.notifs.getTemplates();
  }

  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.notifs.getTemplate(id);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create or update a notification template' })
  upsertTemplate(
    @Body() dto: {
      event: NotificationEventType;
      channel: NotificationChannel;
      name?: string;
      subject?: string;
      body: string;
      variables?: string[];
    },
  ) {
    return this.notifs.upsertTemplate(dto.event, dto.channel, dto);
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: 'Update an existing notification template' })
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: { subject?: string; body?: string; variables?: string[]; isActive?: boolean },
  ) {
    return this.notifs.updateTemplate(id, dto);
  }

  // ── Logs ──────────────────────────────────────────────────────────────────────

  @Get('logs')
  @ApiOperation({ summary: 'Get notification delivery logs' })
  getLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('channel') channel?: NotificationChannel,
    @Query('event') event?: NotificationEventType,
  ) {
    return this.notifs.getNotificationLogs(+page, +limit, channel, event);
  }

  // ── Test sends ────────────────────────────────────────────────────────────────

  @Post('test/sms')
  @ApiOperation({ summary: 'Send a test SMS' })
  testSms(@Body() dto: { phone: string; message: string }) {
    return this.notifs.testSendSms(dto.phone, dto.message);
  }

  @Post('test/whatsapp')
  @ApiOperation({ summary: 'Send a test WhatsApp message' })
  testWhatsApp(@Body() dto: { phone: string; message: string }) {
    return this.notifs.testSendWhatsApp(dto.phone, dto.message);
  }

  @Post('test/email')
  @ApiOperation({ summary: 'Send a test email' })
  testEmail(@Body() dto: { to: string; subject: string; body: string }) {
    return this.notifs.testSendEmail(dto.to, dto.subject, dto.body);
  }

  @Post('test/push')
  @ApiOperation({ summary: 'Send a test push notification' })
  testPush(@Body() dto: { fcmToken: string; title: string; body: string }) {
    return this.notifs.testSendPush(dto.fcmToken, dto.title, dto.body);
  }

  // ── Broadcast / custom sends ────────────────────────────────────────────────

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast notification to a group (ALL / BUYERS / RIDERS / SELLERS) via FCM topic' })
  broadcast(
    @Body() dto: {
      target: 'ALL' | 'BUYERS' | 'RIDERS' | 'SELLERS';
      title: string;
      body: string;
      data?: Record<string, string>;
      imageUrl?: string;
      route?: string;
    },
  ) {
    return this.notifs.broadcast(dto);
  }

  @Post('send-to-user')
  @ApiOperation({ summary: 'Send a custom notification to a specific user' })
  sendToUser(
    @Body() dto: {
      userId: string;
      title: string;
      body: string;
      channels: NotificationChannel[];
      data?: Record<string, string>;
      route?: string;
      imageUrl?: string;
    },
  ) {
    return this.notifs.sendCustomToUser(dto);
  }
}
