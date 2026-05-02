import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  profileImage: true,
  userType: true,
} as const;

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Flatten nested participant data to match frontend interface:
   *   { userId, firstName, lastName, userType, avatarUrl }
   */
  private flattenParticipants(participants: any[]): any[] {
    return (participants || []).map((p) => ({
      userId: p.userId,
      firstName: p.user?.firstName || '',
      lastName: p.user?.lastName || '',
      userType: p.user?.userType || '',
      avatarUrl: p.user?.profileImage || null,
    }));
  }

  async listConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } }, deletedAt: null },
      include: {
        participants: { include: { user: { select: USER_SELECT } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((c: any) => ({
      id: c.id,
      type: c.type || 'direct',
      participants: this.flattenParticipants(c.participants),
      lastMessage: c.messages?.[0] || null,
      unreadCount: 0,
      updatedAt: c.updatedAt,
    }));
  }

  async createConversation(currentUserId: string, participantIds: string[]) {
    const ids = [...new Set([currentUserId, ...(participantIds || [])])];
    const conversation = await this.prisma.conversation.create({
      data: { participants: { create: ids.map((id) => ({ userId: id })) } },
      include: {
        participants: {
          include: { user: { select: USER_SELECT } },
        },
      },
    });
    return {
      ...conversation,
      participants: this.flattenParticipants(conversation.participants as any[]),
    };
  }

  /**
   * Authorization helper — throws ForbiddenException if userId is not a participant.
   * Returns the conversation record (with participants) on success.
   */
  private async assertParticipant(conversationId: string, userId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, deletedAt: null },
      include: { participants: { select: { userId: true } } },
    });
    if (!conv) return null;
    const isParticipant = conv.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }
    return conv;
  }

  /** Admin/soft-delete: mark conversation as deleted without wiping messages. */
  async softDelete(conversationId: string) {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { deletedAt: new Date() },
    });
  }

  async findConversation(id: string, userId: string) {
    await this.assertParticipant(id, userId); // returns null if not found
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          include: { user: { select: USER_SELECT } },
        },
      },
    });
    if (!conversation) return null;
    return {
      ...conversation,
      participants: this.flattenParticipants(conversation.participants as any[]),
    };
  }

  async getMessages(conversationId: string, userId: string, limit?: string, offset?: string) {
    const ok = await this.assertParticipant(conversationId, userId);
    if (!ok) return [];
    return this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: USER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 50,
      skip: offset ? parseInt(offset) : 0,
    });
  }

  async sendMessage(conversationId: string, senderId: string, content: string) {
    // Authorization: sender must be a participant
    await this.assertParticipant(conversationId, senderId);
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: content.trim(),
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    return message;
  }

  async ensureAllConversations(userId: string): Promise<number> {
    const instances = await this.prisma.workflowInstance.findMany({
      where: {
        OR: [{ patientUserId: userId }, { providerUserId: userId }],
      },
      select: { patientUserId: true, providerUserId: true },
    });

    const partnerIds = new Set<string>();
    instances.forEach((i) => {
      if (i.patientUserId !== userId) partnerIds.add(i.patientUserId);
      if (i.providerUserId !== userId) partnerIds.add(i.providerUserId);
    });

    let created = 0;
    for (const partnerId of partnerIds) {
      const existing = await this.prisma.conversation.findFirst({
        where: {
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: partnerId } } },
          ],
        },
      });
      if (!existing) {
        await this.prisma.conversation.create({
          data: {
            participants: {
              create: [{ userId }, { userId: partnerId }],
            },
          },
        });
        created++;
      }
    }
    return created;
  }
}
