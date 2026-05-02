import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { StepFlagHandler, TransitionContext, StepFlagResult } from '../types';

/**
 * Creates a VideoRoom with `mode: 'video'` when the `triggers_video_call`
 * flag is set on the target step. Signaling happens via the shared
 * `WebRtcGateway` — the audio strategy below reuses the same gateway with
 * only the media constraints different on the client.
 */
@Injectable()
export class VideoCallStrategy implements StepFlagHandler {
  flag = 'triggers_video_call' as const;
  constructor(private prisma: PrismaService) {}

  async execute(ctx: TransitionContext): Promise<StepFlagResult> {
    return createRoom(this.prisma, ctx, 'video');
  }
}

/**
 * Audio-only counterpart. Fires on `triggers_audio_call` and creates a
 * VideoRoom with `mode: 'audio'`. The client asks for audio-only media
 * (`getUserMedia({ audio: true, video: false })`); the signaling path
 * is identical to video, so no gateway changes are needed.
 */
@Injectable()
export class AudioCallStrategy implements StepFlagHandler {
  flag = 'triggers_audio_call' as const;
  constructor(private prisma: PrismaService) {}

  async execute(ctx: TransitionContext): Promise<StepFlagResult> {
    return createRoom(this.prisma, ctx, 'audio');
  }
}

async function createRoom(prisma: PrismaService, ctx: TransitionContext, mode: 'video' | 'audio'): Promise<StepFlagResult> {
  const roomId = randomUUID();
  const prefix = mode === 'audio' ? 'AC' : 'WF';
  const roomCode = `${prefix}-${ctx.bookingId.slice(-6)}-${Date.now().toString(36)}`.toUpperCase();
  try {
    await prisma.videoRoom.create({
      data: {
        id: roomId, roomCode, creatorId: ctx.providerUserId, status: 'active',
        mode,
        participants: { create: [
          { userId: ctx.patientUserId, role: 'participant' },
          { userId: ctx.providerUserId, role: 'host' },
        ]},
      },
    });
  } catch {
    console.warn(`Could not create ${mode} room for workflow instance ${ctx.instanceId}`);
  }
  // Return both internal ID and shareable room code so clients can join via /video/:roomCode
  return { videoCallId: roomId, roomCode };
}
