import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebRtcService } from './webrtc.service';

interface RoomData {
  id: string; sessionId?: string; participants: any[]; createdAt: Date; lastActivity: number;
}

const HEARTBEAT_TIMEOUT = 90000;
const RECONNECT_GRACE_PERIOD = 120000;

/**
 * WebRTC Signaling Gateway — replaces the WebRTC portion of server.js.
 * Handles room management, offer/answer/ICE relay, session persistence,
 * heartbeat monitoring, reconnection with grace period.
 */
@WebSocketGateway({
  cors: {
    origin: function (origin: string, callback: (err: Error | null, allow?: boolean) => void) {
      if (!origin || process.env.NODE_ENV !== 'production') return callback(null, true);
      // Comma-separated list via CORS_ALLOWED_ORIGINS; falls back to NEXT_PUBLIC_APP_URL.
      const fromEnv = (process.env.CORS_ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
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
export class WebRtcGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private rooms = new Map<string, RoomData>();
  private socketToRoom = new Map<string, string>();
  private socketToUser = new Map<string, { userId: string; userName: string; userType: string }>();
  private socketHeartbeats = new Map<string, number>();

  constructor(private webrtc: WebRtcService) {
    // Heartbeat monitor
    setInterval(() => {
      const now = Date.now();
      this.socketHeartbeats.forEach((lastHeartbeat, socketId) => {
        if (now - lastHeartbeat > HEARTBEAT_TIMEOUT) {
          const socket = this.server?.sockets?.sockets?.get(socketId);
          if (socket) this.handleDisconnection(socket, 'heartbeat_timeout');
          this.socketHeartbeats.delete(socketId);
        }
      });
    }, 30000);
  }

  handleConnection(client: Socket) {
    this.socketHeartbeats.set(client.id, Date.now());
  }

  handleDisconnect(client: Socket) {
    this.handleDisconnection(client, 'disconnect');
  }

  // ─── Heartbeat ─────────────────────────────────────────────────────────

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId?: string }) {
    this.socketHeartbeats.set(client.id, Date.now());
    client.emit('heartbeat-response', { timestamp: Date.now() });
    if (data?.roomId) {
      const room = this.rooms.get(data.roomId);
      if (room) room.lastActivity = Date.now();
    }
  }

  // ─── Join Room ─────────────────────────────────────────────────────────

  @SubscribeMessage('join-room')
  async handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: {
    roomId: string; userId: string; userType: string; userName: string; sessionId?: string;
  }) {
    // Validate payload — refuse malformed joins (silently dropped data was hiding bugs).
    if (!data || typeof data !== 'object') {
      client.emit('join-error', { reason: 'Invalid payload' });
      return;
    }
    const required = ['roomId', 'userId', 'userType', 'userName'] as const;
    for (const k of required) {
      if (typeof (data as any)[k] !== 'string' || !(data as any)[k].trim()) {
        client.emit('join-error', { field: k, reason: `Missing or invalid ${k}` });
        return;
      }
    }

    this.socketToUser.set(client.id, { userId: data.userId, userName: data.userName, userType: data.userType });

    // Leave current room if switching
    const currentRoom = this.socketToRoom.get(client.id);
    if (currentRoom && currentRoom !== data.roomId) {
      client.leave(currentRoom);
      const room = this.rooms.get(currentRoom);
      if (room) {
        room.participants = room.participants.filter((p: any) => p.socketId !== client.id);
        client.to(currentRoom).emit('user-left', { socketId: client.id, reason: 'room_change' });
        if (room.participants.length === 0) this.rooms.delete(currentRoom);
      }
    }

    client.join(data.roomId);
    this.socketToRoom.set(client.id, data.roomId);

    if (!this.rooms.has(data.roomId)) {
      this.rooms.set(data.roomId, { id: data.roomId, sessionId: data.sessionId, participants: [], createdAt: new Date(), lastActivity: Date.now() });
    }

    const room = this.rooms.get(data.roomId)!;
    room.lastActivity = Date.now();

    // Check if reconnecting
    const existingIndex = room.participants.findIndex((p: any) => p.userId === data.userId);
    if (existingIndex !== -1) {
      const oldSocketId = room.participants[existingIndex].socketId;
      room.participants[existingIndex] = { socketId: client.id, userId: data.userId, userType: data.userType, userName: data.userName, joinedAt: room.participants[existingIndex].joinedAt, connected: true, reconnected: true, reconnectedAt: new Date() };
      client.to(data.roomId).emit('user-reconnected', { oldSocketId, newSocketId: client.id, userId: data.userId, userName: data.userName, userType: data.userType });
    } else {
      const participant = { socketId: client.id, userId: data.userId, userType: data.userType, userName: data.userName, joinedAt: new Date(), connected: true };
      room.participants.push(participant);
      client.to(data.roomId).emit('user-joined', participant);
    }

    // Send existing participants
    client.emit('existing-participants', {
      participants: room.participants.filter((p: any) => p.socketId !== client.id && p.connected !== false),
      sessionId: data.sessionId,
    });

    // Persist to DB
    this.persistSession(data.roomId, room.participants);
  }

  // ─── WebRTC Signaling ──────────────────────────────────────────────────

  @SubscribeMessage('offer')
  handleOffer(@ConnectedSocket() client: Socket, @MessageBody() data: { offer: any; to: string }) {
    const target = this.server.sockets.sockets.get(data.to);
    if (target) target.emit('offer', { offer: data.offer, from: client.id });
    else client.emit('peer-not-found', { targetId: data.to });
  }

  @SubscribeMessage('answer')
  handleAnswer(@ConnectedSocket() client: Socket, @MessageBody() data: { answer: any; to: string }) {
    const target = this.server.sockets.sockets.get(data.to);
    if (target) target.emit('answer', { answer: data.answer, from: client.id });
    else client.emit('peer-not-found', { targetId: data.to });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(@ConnectedSocket() client: Socket, @MessageBody() data: { candidate: any; to: string }) {
    const target = this.server.sockets.sockets.get(data.to);
    if (target) target.emit('ice-candidate', { candidate: data.candidate, from: client.id });
  }

  @SubscribeMessage('ice-restart')
  handleIceRestart(@ConnectedSocket() client: Socket, @MessageBody() data: { to: string }) {
    const target = this.server.sockets.sockets.get(data.to);
    if (target) target.emit('ice-restart-request', { from: client.id });
  }

  // ─── Media Controls ────────────────────────────────────────────────────

  @SubscribeMessage('toggle-video')
  handleToggleVideo(@ConnectedSocket() client: Socket, @MessageBody() data: { enabled: boolean; roomId: string }) {
    client.to(data.roomId).emit('peer-toggle-video', { socketId: client.id, enabled: data.enabled });
  }

  @SubscribeMessage('toggle-audio')
  handleToggleAudio(@ConnectedSocket() client: Socket, @MessageBody() data: { enabled: boolean; roomId: string }) {
    client.to(data.roomId).emit('peer-toggle-audio', { socketId: client.id, enabled: data.enabled });
  }

  @SubscribeMessage('start-screen-share')
  handleStartScreenShare(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.to(data.roomId).emit('peer-started-screen-share', { socketId: client.id });
  }

  @SubscribeMessage('stop-screen-share')
  handleStopScreenShare(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.to(data.roomId).emit('peer-stopped-screen-share', { socketId: client.id });
  }

  // ─── Video Chat Messages ───────────────────────────────────────────────

  @SubscribeMessage('chat-message')
  handleChatMessage(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; message: string; userName: string; userType: string }) {
    if (!data?.message?.trim()) return;
    this.server.to(data.roomId).emit('new-chat-message', {
      message: data.message.trim(), userName: data.userName, userType: data.userType,
      timestamp: new Date().toISOString(), socketId: client.id,
    });
  }

  // ─── Session Recovery ──────────────────────────────────────────────────

  @SubscribeMessage('request-recovery')
  async handleRecovery(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; userId: string }) {
    const room = this.rooms.get(data.roomId);
    if (room) {
      client.emit('recovery-info', { canRecover: true, session: { id: room.sessionId, roomId: room.id, participants: room.participants.filter((p: any) => p.connected !== false) } });
      return;
    }
    // Check DB via service (clean-architecture: no Prisma in gateways)
    const session = await this.webrtc.findSessionForRecovery(data.roomId);
    if (session && session.status === 'active') {
      client.emit('recovery-info', {
        canRecover: true,
        session: {
          id: session.id,
          roomId: data.roomId,
          participants: session.connections
            .filter(c => c.connectionState !== 'ended')
            .map(c => ({ socketId: null, userId: c.userId, userName: c.userName, userType: c.userType, connected: false })),
        },
      });
    } else {
      client.emit('recovery-info', { canRecover: false, reason: 'Session not found' });
    }
  }

  // ─── Room Info ─────────────────────────────────────────────────────────

  @SubscribeMessage('get-room-info')
  async handleRoomInfo(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const room = this.rooms.get(data.roomId);
    if (room) {
      client.emit('room-info', { ...room, participantCount: room.participants.filter((p: any) => p.connected !== false).length, isActive: Date.now() - room.lastActivity < 300000, canRecover: true });
    } else {
      client.emit('room-info', null);
    }
  }

  // ─── Leave ─────────────────────────────────────────────────────────────

  @SubscribeMessage('leave-room')
  handleLeaveRoom(@ConnectedSocket() client: Socket) {
    this.handleDisconnection(client, 'leave_room');
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private async handleDisconnection(socket: Socket, reason: string) {
    const roomId = this.socketToRoom.get(socket.id);
    const userInfo = this.socketToUser.get(socket.id);

    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        if (reason === 'leave_room') {
          room.participants = room.participants.filter((p: any) => p.socketId !== socket.id);
          socket.to(roomId).emit('user-disconnected', { socketId: socket.id, userId: userInfo?.userId, reason, canReconnect: false });
        } else {
          const participant = room.participants.find((p: any) => p.socketId === socket.id);
          if (participant) { participant.connected = false; participant.disconnectedAt = Date.now(); }
          socket.to(roomId).emit('user-disconnected', { socketId: socket.id, userId: userInfo?.userId, reason, canReconnect: true, gracePeriod: RECONNECT_GRACE_PERIOD });
          setTimeout(() => {
            const currentRoom = this.rooms.get(roomId);
            if (currentRoom) {
              const stillDisconnected = currentRoom.participants.find((p: any) => p.userId === userInfo?.userId && p.connected === false);
              if (stillDisconnected) {
                currentRoom.participants = currentRoom.participants.filter((p: any) => p.userId !== userInfo?.userId);
                this.server.to(roomId).emit('user-left-permanently', { userId: userInfo?.userId, userName: userInfo?.userName });
                if (currentRoom.participants.length === 0) { this.rooms.delete(roomId); this.endSession(roomId); }
              }
            }
          }, RECONNECT_GRACE_PERIOD);
        }
        if (room.participants.length === 0) { this.rooms.delete(roomId); this.endSession(roomId); }
      }
      this.socketToRoom.delete(socket.id);
    }
    this.socketToUser.delete(socket.id);
    this.socketHeartbeats.delete(socket.id);
  }

  private persistSession(roomId: string, participants: any[]) {
    return this.webrtc.persistLiveSession(roomId, participants);
  }

  private endSession(roomId: string) {
    return this.webrtc.markLiveSessionEnded(roomId);
  }
}
