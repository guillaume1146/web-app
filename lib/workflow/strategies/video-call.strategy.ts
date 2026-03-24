import prisma from '@/lib/db'
import crypto from 'crypto'
import type { StepFlagHandler, TransitionContext, StepFlagResult } from '../types'

export class VideoCallStrategy implements StepFlagHandler {
  flag = 'triggers_video_call' as const

  async execute(ctx: TransitionContext): Promise<StepFlagResult> {
    const roomId = crypto.randomUUID()
    const roomCode = `WF-${ctx.bookingId.slice(-6)}-${Date.now().toString(36)}`.toUpperCase()

    try {
      await prisma.videoRoom.create({
        data: {
          id: roomId,
          roomCode,
          creatorId: ctx.providerUserId,
          status: 'active',
          participants: {
            create: [
              { userId: ctx.patientUserId, role: 'participant' },
              { userId: ctx.providerUserId, role: 'host' },
            ],
          },
        },
      })
    } catch {
      console.warn(`Could not create video room for workflow instance ${ctx.instanceId}`)
    }

    return { videoCallId: roomId }
  }
}
