import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationType, MessageType } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // ── Get all conversations for a user ─────────────────────────────────────────
  async getConversations(userId: string) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true, phone: true } },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              where: { isDeleted: false },
              include: { sender: { select: { firstName: true } } },
            },
          },
        },
      },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
    });

    return participants.map(p => ({
      ...p.conversation,
      unreadCount: p.unreadCount,
      myRole: p.role,
      lastMessage: p.conversation.messages[0] ?? null,
      otherParticipants: p.conversation.participants
        .filter(x => x.userId !== userId)
        .map(x => ({ ...x.user, role: x.role })),
    }));
  }

  // ── Start or get existing conversation ───────────────────────────────────────
  async startConversation(initiatorId: string, dto: {
    targetUserId: string;
    type: ConversationType;
    orderId?: string;
    subject?: string;
    initialMessage?: string;
  }) {
    // Check for existing conversation between the same two parties on the same order
    const existing = await this.prisma.conversationParticipant.findFirst({
      where: {
        userId: initiatorId,
        conversation: {
          type: dto.type,
          orderId: dto.orderId ?? null,
          participants: { some: { userId: dto.targetUserId } },
        },
      },
      include: { conversation: true },
    });
    if (existing) return existing.conversation;

    // Resolve roles
    const [initiator, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: initiatorId } }),
      this.prisma.user.findUnique({ where: { id: dto.targetUserId } }),
    ]);
    if (!initiator || !target) throw new NotFoundException('User not found');

    const conv = await this.prisma.conversation.create({
      data: {
        type: dto.type,
        orderId: dto.orderId,
        subject: dto.subject,
        lastMessageAt: new Date(),
        participants: {
          create: [
            { userId: initiatorId, role: initiator.role },
            { userId: dto.targetUserId, role: target.role },
          ],
        },
      },
    });

    if (dto.initialMessage) {
      await this.createMessage(initiatorId, conv.id, dto.initialMessage);
    }

    return conv;
  }

  // ── Get messages in a conversation ───────────────────────────────────────────
  async getMessages(userId: string, conversationId: string, page = 1, limit = 50) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('Not a participant');

    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
        },
      }),
      this.prisma.message.count({ where: { conversationId, isDeleted: false } }),
    ]);

    return { data: messages.reverse(), total, page, totalPages: Math.ceil(total / limit) };
  }

  // ── Send a message ────────────────────────────────────────────────────────────
  async createMessage(
    senderId: string,
    conversationId: string,
    body: string,
    type: MessageType = MessageType.TEXT,
    mediaUrl?: string,
  ) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: senderId } },
    });
    if (!participant) throw new ForbiddenException('Not a participant');

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, senderId, body, type, mediaUrl },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
      // Increment unread for all other participants
      this.prisma.conversationParticipant.updateMany({
        where: { conversationId, userId: { not: senderId } },
        data: { unreadCount: { increment: 1 } },
      }),
    ]);

    return message;
  }

  // ── Mark conversation as read ─────────────────────────────────────────────────
  async markRead(userId: string, conversationId: string) {
    return this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { unreadCount: 0, lastReadAt: new Date() },
    });
  }

  // ── Total unread count for a user ─────────────────────────────────────────────
  async getUnreadCount(userId: string) {
    const result = await this.prisma.conversationParticipant.aggregate({
      where: { userId },
      _sum: { unreadCount: true },
    });
    return { unread: result._sum.unreadCount ?? 0 };
  }

  // ── Admin: get all conversations ──────────────────────────────────────────────
  async adminGetAll(type?: string, resolved?: boolean, page = 1, limit = 30) {
    const where: any = {};
    if (type) where.type = type;
    if (resolved !== undefined) where.isResolved = resolved;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          participants: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true, phone: true } },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: { select: { firstName: true } } },
          },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ── Admin: resolve a conversation ─────────────────────────────────────────────
  async resolveConversation(id: string) {
    return this.prisma.conversation.update({ where: { id }, data: { isResolved: true } });
  }

  // ── Join admin to support conversation ───────────────────────────────────────
  async joinAsAdmin(adminId: string, conversationId: string) {
    const existing = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: adminId } },
    });
    if (existing) return existing;
    return this.prisma.conversationParticipant.create({
      data: { conversationId, userId: adminId, role: 'ADMIN' },
    });
  }
}
