import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Video-call session + room management. All Prisma access for the WebRTC
 * feature lives here — controllers and gateways delegate to this service per
 * .claude/rules/clean-architecture.md.
 */
@Injectable()
export class WebRtcService {
  constructor(private prisma: PrismaService) {}

  // ─── Session lifecycle ─────────────────────────────────────────────────

  async getActiveSession(roomCode: string) {
    if (!roomCode) return null;
    const videoRoom = await this.prisma.videoRoom.findFirst({ where: { roomCode } });
    if (!videoRoom) return null;
    const session = await this.prisma.videoCallSession.findFirst({
      where: { roomId: videoRoom.id, status: 'active' },
    });
    if (!session) return null;
    return { id: session.id, roomId: roomCode, status: session.status, isActive: true, startedAt: session.startedAt };
  }

  async createOrJoinSession(roomCode: string, userId: string, userName?: string) {
    if (!roomCode || !userId) throw new Error('roomId and userId are required');

    const videoRoom = await this.prisma.videoRoom.findFirst({ where: { roomCode } });
    if (!videoRoom) throw new Error('Video room not found. Create a room via /api/video/room first.');

    const existing = await this.prisma.videoCallSession.findFirst({
      where: { roomId: videoRoom.id, status: 'active' },
    });

    if (existing) {
      if (userName) {
        await this.prisma.webRTCConnection.upsert({
          where: { sessionId_userId: { sessionId: existing.id, userId } },
          create: { sessionId: existing.id, userId, userName, connectionState: 'new' },
          update: { userName, connectionState: 'new' },
        }).catch(() => {});
      }
      return { session: { id: existing.id, roomId: roomCode, status: existing.status, isActive: true } };
    }

    const session = await this.prisma.videoCallSession.create({
      data: { roomId: videoRoom.id, userId, status: 'active' },
    });

    if (userName) {
      await this.prisma.webRTCConnection.create({
        data: { sessionId: session.id, userId, userName, connectionState: 'new' },
      }).catch(() => {});
    }

    return { session: { id: session.id, roomId: roomCode, status: session.status, isActive: true } };
  }

  async updateSessionHealth(sessionId: string, connectionState?: string) {
    if (!sessionId) throw new Error('sessionId is required');
    await this.prisma.videoCallSession.update({
      where: { id: sessionId },
      data: { status: connectionState === 'failed' ? 'failed' : 'active' },
    });
  }

  async endSession(sessionId: string) {
    if (!sessionId) throw new Error('sessionId is required');
    await this.prisma.videoCallSession.update({
      where: { id: sessionId },
      data: { status: 'completed', endedAt: new Date() },
    });
  }

  // ─── Recovery ──────────────────────────────────────────────────────────

  async recoverSession(roomCode: string, requesterId?: string) {
    if (!roomCode) return { canRecover: false, reason: 'roomId is required' };

    const session = await this.prisma.videoCallSession.findFirst({
      where: { room: { roomCode }, status: { in: ['active', 'ended'] } },
      include: {
        connections: { select: { userId: true, userName: true, userType: true, connectionState: true, lastSeenAt: true } },
        room: { select: { id: true, roomCode: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!session) return { canRecover: false, reason: 'No session found' };

    if (session.status === 'ended' && session.endedAt) {
      const fiveMin = 5 * 60 * 1000;
      if (Date.now() - session.endedAt.getTime() > fiveMin) {
        return { canRecover: false, reason: 'Session expired' };
      }
      await this.prisma.videoCallSession.update({
        where: { id: session.id },
        data: { status: 'active', endedAt: null },
      });
    }

    if (requesterId) {
      await this.prisma.webRTCConnection.upsert({
        where: { sessionId_userId: { sessionId: session.id, userId: requesterId } },
        create: { sessionId: session.id, userId: requesterId, userName: 'Recovering', connectionState: 'reconnecting' },
        update: { connectionState: 'reconnecting' },
      }).catch(() => {});
    }

    return {
      canRecover: true,
      session: {
        id: session.id,
        roomId: roomCode,
        status: session.status,
        startedAt: session.startedAt,
        participants: session.connections
          .filter(c => c.connectionState !== 'ended')
          .map(c => ({ userId: c.userId, userName: c.userName, userType: c.userType, connected: c.connectionState === 'connected' })),
      },
    };
  }

  // ─── Video rooms listing (enriched with booking + participant data) ────

  async listRoomsForUser(userId: string, mode?: 'video' | 'audio') {
    const rooms = await this.prisma.videoRoom.findMany({
      where: {
        OR: [{ creatorId: userId }, { participants: { some: { userId } } }],
        ...(mode ? { mode } : {}),
      },
      include: { participants: { select: { userId: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return Promise.all(rooms.map(async (room) => {
      const booking = await this._resolveBookingForRoom(room);
      const otherUserId = room.participants.find(p => p.userId !== userId)?.userId || room.creatorId;
      const otherUser = otherUserId
        ? await this.prisma.user.findUnique({
            where: { id: otherUserId },
            select: { firstName: true, lastName: true, profileImage: true },
          })
        : null;

      let patientName = 'Unknown Patient';
      if (booking?.patientId) {
        const patient = await this.prisma.patientProfile.findUnique({
          where: { id: booking.patientId },
          include: { user: { select: { firstName: true, lastName: true } } },
        });
        if (patient) patientName = `${patient.user.firstName} ${patient.user.lastName}`;
      }

      return {
        id: room.id,
        roomId: room.roomCode || '',
        mode: (room as any).mode || 'video',
        scheduledAt: booking?.scheduledAt || room.createdAt,
        endedAt: room.status === 'ended' ? room.updatedAt : null,
        status: room.status || 'active',
        reason: booking?.reason || booking?.serviceName || 'Consultation',
        duration: booking?.duration || 30,
        participantName: otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : patientName,
        participantImage: otherUser?.profileImage || null,
        type: booking?.type || 'video',
      };
    }));
  }

  // ─── Gateway helpers (called from WebRtcGateway, no Prisma in gateway) ────

  /** Look up the active session and its connections for recovery via socket. */
  async findSessionForRecovery(roomCode: string) {
    try {
      return await this.prisma.videoCallSession.findUnique({
        where: { id: `session_${roomCode}` },
        include: { connections: true },
      });
    } catch {
      return null;
    }
  }

  /** Persist live participants to DB so a client can recover after disconnect. */
  async persistLiveSession(roomCode: string, participants: Array<{ userId: string; userType: string; userName: string; socketId: string }>) {
    try {
      const videoRoom = await this.prisma.videoRoom.findUnique({ where: { roomCode } });
      if (!videoRoom) return;
      const patientId = participants.find(p => p.userType === 'patient')?.userId || null;
      const doctorId = participants.find(p => p.userType === 'doctor')?.userId || null;
      const session = await this.prisma.videoCallSession.upsert({
        where: { id: `session_${roomCode}` },
        update: { status: 'active', updatedAt: new Date() },
        create: { id: `session_${roomCode}`, roomId: videoRoom.id, patientId, doctorId, status: 'active' },
      });
      for (const p of participants) {
        await this.prisma.webRTCConnection.upsert({
          where: { sessionId_userId: { sessionId: session.id, userId: p.userId } },
          update: { socketId: p.socketId, connectionState: 'connected', lastSeen: new Date() },
          create: {
            sessionId: session.id, userId: p.userId, userType: p.userType,
            userName: p.userName, socketId: p.socketId, connectionState: 'connecting',
          },
        });
      }
    } catch (err) {
      // Persist failures must not break live calls — log only.
      console.error('persistLiveSession error:', (err as Error).message);
    }
  }

  /** Mark a live session ended (called when last participant leaves). */
  async markLiveSessionEnded(roomCode: string) {
    try {
      await this.prisma.videoCallSession.update({
        where: { id: `session_${roomCode}` },
        data: { status: 'ended', endedAt: new Date() },
      });
    } catch { /* session may not exist yet */ }
  }

  /** Resolve the ServiceBooking tied to a VideoRoom (by roomCode prefix, or via workflow log). */
  private async _resolveBookingForRoom(room: { id: string; roomCode: string | null }) {
    const parts = room.roomCode?.split('-') || [];
    const bookingPrefix = parts.length >= 2 ? parts[1] : null;

    if (bookingPrefix) {
      const booking = await this.prisma.serviceBooking.findFirst({
        where: { id: { startsWith: bookingPrefix.toLowerCase() } },
      });
      if (booking) return booking;
    }

    const session = await this.prisma.videoCallSession.findFirst({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!session) return null;

    const wfLog = await this.prisma.workflowStepLog.findFirst({
      where: { content: { path: ['videoCallId'], string_contains: session.id } },
      select: { instanceId: true },
    }).catch(() => null);
    if (!wfLog) return null;

    const wfInstance = await this.prisma.workflowInstance.findUnique({ where: { id: wfLog.instanceId } });
    if (!wfInstance) return null;

    return this.prisma.serviceBooking.findUnique({ where: { id: wfInstance.bookingId } });
  }
}
