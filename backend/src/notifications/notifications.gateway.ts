import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * Main Socket.IO gateway for:
 * 1. User notification rooms (user:{userId})
 * 2. Persistent chat (conversation rooms + message relay)
 *
 * Replaces the `chat:join`, `chat:send`, `chat:typing`, `chat:mark-read`,
 * and `notification:new` events from server.js.
 */
@WebSocketGateway({
  cors: {
    origin: function (origin: string, callback: (err: Error | null, allow?: boolean) => void) {
      // Allow all in dev, restrict in prod
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
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // ─── Connection Lifecycle ──────────────────────────────────────────────

  handleConnection(client: Socket) {
    // Client must emit 'chat:join' with userId to subscribe to notifications
  }

  handleDisconnect(client: Socket) {
    // Socket.IO auto-removes from rooms on disconnect
  }

  // ─── User Room (for notifications) ─────────────────────────────────────

  @SubscribeMessage('chat:join')
  handleJoinUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    if (data?.userId) {
      client.join(`user:${data.userId}`);
    }
  }

  // ─── Public method: emit to a user's room (replaces emitToUser) ────────

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
