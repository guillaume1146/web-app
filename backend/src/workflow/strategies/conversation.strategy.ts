import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { StepFlagHandler, TransitionContext, StepFlagResult } from '../types';

@Injectable()
export class ConversationStrategy implements StepFlagHandler {
  flag = 'triggers_conversation' as const;
  constructor(private prisma: PrismaService) {}

  async execute(ctx: TransitionContext): Promise<StepFlagResult> {
    const existing = await this.prisma.conversation.findFirst({
      where: { participants: { every: { userId: { in: [ctx.patientUserId, ctx.providerUserId] } } } },
      include: { participants: { select: { userId: true } } },
    });
    const hasConvo = existing && existing.participants.length === 2 &&
      existing.participants.some(p => p.userId === ctx.patientUserId) &&
      existing.participants.some(p => p.userId === ctx.providerUserId);
    if (hasConvo) return { conversationId: existing!.id };

    const conversation = await this.prisma.conversation.create({
      data: { participants: { create: [{ userId: ctx.patientUserId }, { userId: ctx.providerUserId }] } },
    });
    return { conversationId: conversation.id };
  }
}
