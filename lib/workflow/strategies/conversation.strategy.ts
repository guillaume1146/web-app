/**
 * Conversation Strategy — auto-creates a chat conversation between patient and provider.
 */
import prisma from '@/lib/db'
import type { StepFlagHandler, TransitionContext, StepFlagResult } from '../types'

export class ConversationStrategy implements StepFlagHandler {
  flag = 'triggers_conversation' as const

  async execute(ctx: TransitionContext): Promise<StepFlagResult> {
    // Check if conversation already exists between these users
    const existing = await prisma.conversation.findFirst({
      where: {
        participants: {
          every: {
            userId: { in: [ctx.patientUserId, ctx.providerUserId] },
          },
        },
      },
      include: {
        participants: { select: { userId: true } },
      },
    })

    // Only create if exactly these 2 users don't already have a conversation
    const hasConvo = existing && existing.participants.length === 2 &&
      existing.participants.some(p => p.userId === ctx.patientUserId) &&
      existing.participants.some(p => p.userId === ctx.providerUserId)

    if (hasConvo) {
      return { conversationId: existing!.id }
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId: ctx.patientUserId },
            { userId: ctx.providerUserId },
          ],
        },
      },
    })

    return { conversationId: conversation.id }
  }
}
