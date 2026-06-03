import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private chatService: ChatService) {}

  // ── My conversations ──────────────────────────────────────────────────────────
  @Get('conversations')
  @ApiOperation({ summary: 'List my conversations' })
  getConversations(@CurrentUser('id') userId: string) {
    return this.chatService.getConversations(userId);
  }

  // ── Unread count ──────────────────────────────────────────────────────────────
  @Get('unread')
  @ApiOperation({ summary: 'Total unread messages count' })
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.chatService.getUnreadCount(userId);
  }

  // ── Start a new conversation ──────────────────────────────────────────────────
  @Post('conversations')
  @ApiOperation({ summary: 'Start or resume a conversation' })
  startConversation(
    @CurrentUser('id') userId: string,
    @Body() dto: {
      targetUserId: string;
      type: any;
      orderId?: string;
      subject?: string;
      initialMessage?: string;
    },
  ) {
    return this.chatService.startConversation(userId, dto);
  }

  // ── Get messages in a conversation ───────────────────────────────────────────
  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  getMessages(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.chatService.getMessages(userId, conversationId, +page, +limit);
  }

  // ── Send message (REST fallback) ──────────────────────────────────────────────
  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message (REST fallback)' })
  sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: { body: string; type?: any; mediaUrl?: string },
  ) {
    return this.chatService.createMessage(userId, conversationId, dto.body, dto.type, dto.mediaUrl);
  }

  // ── Mark as read ──────────────────────────────────────────────────────────────
  @Patch('conversations/:id/read')
  markRead(@CurrentUser('id') userId: string, @Param('id') conversationId: string) {
    return this.chatService.markRead(userId, conversationId);
  }

  // ── Admin: list all conversations ─────────────────────────────────────────────
  @Get('admin/conversations')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF)
  @UseGuards(RolesGuard)
  adminList(
    @Query('type') type?: string,
    @Query('resolved') resolved?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 30,
  ) {
    return this.chatService.adminGetAll(
      type,
      resolved === 'true' ? true : resolved === 'false' ? false : undefined,
      +page,
      +limit,
    );
  }

  // ── Admin: join conversation as support ───────────────────────────────────────
  @Post('admin/conversations/:id/join')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF)
  @UseGuards(RolesGuard)
  joinAsAdmin(@CurrentUser('id') adminId: string, @Param('id') conversationId: string) {
    return this.chatService.joinAsAdmin(adminId, conversationId);
  }

  // ── Admin: resolve conversation ───────────────────────────────────────────────
  @Patch('admin/conversations/:id/resolve')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF)
  @UseGuards(RolesGuard)
  resolve(@Param('id') id: string) {
    return this.chatService.resolveConversation(id);
  }
}
