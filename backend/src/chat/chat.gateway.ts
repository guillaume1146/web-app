import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Persistent chat gateway — replaces the chat:* events from server.js.
 * Handles conversation rooms, message persistence, typing indicators, and read receipts.
 */
@WebSocketGateway({
  cors: {
    origin: function (origin: string, callback: (err: Error | null, allow?: boolean) => void) {
      if (!origin || process.env.NODE_ENV !== 'production') return callback(null, true);
      const fromEnv = (process.env.CORS_ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || '')
        .split(',').map(s => s.trim()).filter(Boolean);
      if (fromEnv.length === 0 || fromEnv.some(a => origin.startsWith(a))) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private prisma: PrismaService) {}

  // ─── Conversation Rooms ────────────────────────────────────────────────

  @SubscribeMessage('chat:join-conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      client.join(`conversation:${data.conversationId}`);
    }
  }

  @SubscribeMessage('chat:leave-conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      client.leave(`conversation:${data.conversationId}`);
    }
  }

  // ─── Send Message (persisted to DB) ────────────────────────────────────

  @SubscribeMessage('chat:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      conversationId: string;
      content: string;
      senderId: string;
      senderName?: string;
      senderType?: string;
    },
  ) {
    if (!data?.content?.trim() || !data?.conversationId || !data?.senderId) return;

    try {
      // Persist message
      const message = await this.prisma.message.create({
        data: {
          conversationId: data.conversationId,
          senderId: data.senderId,
          content: data.content.trim(),
        },
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          content: true,
          createdAt: true,
        },
      });

      // Update conversation timestamp
      await this.prisma.conversation.update({
        where: { id: data.conversationId },
        data: { updatedAt: new Date() },
      });

      // Get all participants
      const participants = await this.prisma.conversationParticipant.findMany({
        where: { conversationId: data.conversationId },
        select: { userId: true },
      });

      const payload = {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: data.senderName || 'Unknown',
        senderType: data.senderType || 'MEMBER',
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      };

      // Emit to all participants' personal rooms
      for (const p of participants) {
        this.server.to(`user:${p.userId}`).emit('chat:message', payload);
      }
    } catch (error) {
      console.error('Chat send error:', (error as Error).message);
    }
  }

  // ─── Typing Indicators ─────────────────────────────────────────────────

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string; userName: string },
  ) {
    if (data?.conversationId) {
      client.to(`conversation:${data.conversationId}`).emit('chat:typing', {
        conversationId: data.conversationId,
        userId: data.userId,
        userName: data.userName,
      });
    }
  }

  @SubscribeMessage('chat:stop-typing')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string },
  ) {
    if (data?.conversationId) {
      client.to(`conversation:${data.conversationId}`).emit('chat:stop-typing', {
        conversationId: data.conversationId,
        userId: data.userId,
      });
    }
  }

  // ─── Read Receipts ─────────────────────────────────────────────────────

  @SubscribeMessage('chat:mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string },
  ) {
    if (!data?.conversationId || !data?.userId) return;

    try {
      await this.prisma.message.updateMany({
        where: {
          conversationId: data.conversationId,
          senderId: { not: data.userId },
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      // Notify other participants
      client.to(`conversation:${data.conversationId}`).emit('chat:read', {
        conversationId: data.conversationId,
        userId: data.userId,
      });
    } catch (error) {
      console.error('Chat mark-read error:', (error as Error).message);
    }
  }
}
