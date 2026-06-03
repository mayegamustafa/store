import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { MessageType } from '@prisma/client';

/**
 * Real-time Chat WebSocket Gateway
 * Namespace: /chat
 *
 * Client → Server events:
 *  chat:join        { conversationId }  — join a chat room
 *  chat:leave       { conversationId }  — leave a chat room
 *  chat:send        { conversationId, body, type?, mediaUrl? }
 *  chat:typing      { conversationId, isTyping }
 *  chat:read        { conversationId }
 *  chat:call_request { conversationId, callType }  — "voice" | "video"
 *
 * Server → Client events:
 *  chat:message    — new message object
 *  chat:typing     — typing indicator { userId, isTyping }
 *  chat:read       — read receipt { userId, conversationId }
 *  chat:call       — incoming call request { from, callType, conversationId }
 *  chat:error      — error string
 */
@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private userSockets = new Map<string, Set<string>>(); // userId → Set<socketId>

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  private extractUser(client: Socket): { id: string } | null {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return null;
      return this.jwtService.verify(token);
    } catch {
      return null;
    }
  }

  handleConnection(client: Socket) {
    const user = this.extractUser(client);
    if (!user) { client.disconnect(); return; }

    client.data.userId = user.id;
    if (!this.userSockets.has(user.id)) this.userSockets.set(user.id, new Set());
    this.userSockets.get(user.id)!.add(client.id);
    client.join(`user:${user.id}`); // personal room for direct pushes
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSockets.delete(userId);
      }
    }
  }

  // ── Join a conversation room ──────────────────────────────────────────────────
  @SubscribeMessage('chat:join')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    const userId = client.data.userId;
    if (!userId) return;
    client.join(`conv:${data.conversationId}`);
    await this.chatService.markRead(userId, data.conversationId).catch(() => null);
    this.server.to(`user:${userId}`).emit('chat:read', { conversationId: data.conversationId });
  }

  // ── Leave a conversation room ─────────────────────────────────────────────────
  @SubscribeMessage('chat:leave')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.leave(`conv:${data.conversationId}`);
  }

  // ── Send a message ────────────────────────────────────────────────────────────
  @SubscribeMessage('chat:send')
  async handleSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; body: string; type?: string; mediaUrl?: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.body?.trim()) return;
    try {
      const message = await this.chatService.createMessage(
        userId,
        data.conversationId,
        data.body,
        (data.type as MessageType) || MessageType.TEXT,
        data.mediaUrl,
      );
      // Broadcast to the conversation room
      this.server.to(`conv:${data.conversationId}`).emit('chat:message', message);
      return message;
    } catch (e: any) {
      client.emit('chat:error', e.message);
    }
  }

  // ── Typing indicator ──────────────────────────────────────────────────────────
  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    client.to(`conv:${data.conversationId}`).emit('chat:typing', { userId, isTyping: data.isTyping });
  }

  // ── Mark as read ──────────────────────────────────────────────────────────────
  @SubscribeMessage('chat:read')
  async handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    await this.chatService.markRead(userId, data.conversationId).catch(() => null);
    client.to(`conv:${data.conversationId}`).emit('chat:read', { userId, conversationId: data.conversationId });
  }

  // ── Call request ──────────────────────────────────────────────────────────────
  @SubscribeMessage('chat:call_request')
  async handleCallRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; callType: 'voice' | 'video' },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    // Send call notification to all participants in the room
    const message = await this.chatService.createMessage(
      userId,
      data.conversationId,
      `📞 ${data.callType === 'video' ? 'Video' : 'Voice'} call requested`,
      MessageType.CALL_REQUEST,
    ).catch(() => null);
    if (message) {
      this.server.to(`conv:${data.conversationId}`).emit('chat:message', message);
      this.server.to(`conv:${data.conversationId}`).emit('chat:call', {
        from: userId,
        callType: data.callType,
        conversationId: data.conversationId,
      });
    }
  }

  // ── Server helper: push message to user regardless of which room they're in ───
  pushToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
