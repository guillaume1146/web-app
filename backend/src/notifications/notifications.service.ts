import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceId?: string;
  referenceType?: string;
  /** Structured payload — drives contextual CTAs on the notification card. */
  payload?: Record<string, unknown>;
  /** Same-day notifications with the same groupKey collapse into one card
   *  when the caller requests ?grouped=true. Defaults: workflow → "booking:<id>";
   *  insurance → "insurance:<companyId>". */
  groupKey?: string;
}

/**
 * Replaces lib/notifications.ts createNotification().
 * Creates DB record + emits Socket.IO event to user room.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  async createNotification(params: CreateNotificationParams) {
    // Derive a default groupKey so same-booking updates on the same day
    // collapse into one row in the inbox.
    const groupKey = params.groupKey
      ?? (params.referenceId && params.referenceType
            ? `${params.referenceType}:${params.referenceId}`
            : undefined);

    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        referenceId: params.referenceId || null,
        referenceType: params.referenceType || null,
        payload: params.payload ? (params.payload as any) : undefined,
        groupKey,
      },
    });

    // Emit real-time notification via Socket.IO
    this.gateway.emitToUser(params.userId, 'notification:new', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
      referenceId: notification.referenceId,
      referenceType: notification.referenceType,
      payload: notification.payload,
      groupKey: notification.groupKey,
    });

    return notification;
  }

  /**
   * Mark a single notification read and broadcast 'notification:read' over Socket.IO
   * so other tabs/devices belonging to the same user update without re-fetching.
   */
  async markRead(userId: string, notificationId: string) {
    const updated = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (updated.count > 0) {
      this.gateway.emitToUser(userId, 'notification:read', { id: notificationId });
    }
    return { ok: updated.count > 0 };
  }

  /** Mark every unread notification read; broadcast a single 'notification:read-all' event. */
  async markAllRead(userId: string) {
    const updated = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (updated.count > 0) {
      this.gateway.emitToUser(userId, 'notification:read-all', { count: updated.count });
    }
    return { count: updated.count };
  }
}
