import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Run every 15 minutes — check for upcoming bookings and send reminders.
   * Sends 24h and 1h reminders to patients and providers.
   */
  @Cron('0 */15 * * * *')
  async checkUpcomingBookings() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);

    // ─── 24h reminders (within 15-min window) ───────────────────────────
    const upcoming24h = await this.prisma.serviceBooking.findMany({
      where: {
        status: { in: ['confirmed', 'accepted'] },
        scheduledAt: {
          gte: new Date(in24h.getTime() - 15 * 60 * 1000),
          lte: in24h,
        },
      },
      select: {
        id: true,
        patientId: true,
        providerUserId: true,
        providerName: true,
        scheduledAt: true,
        serviceName: true,
      },
    });

    for (const booking of upcoming24h) {
      const patient = await this.prisma.patientProfile.findUnique({
        where: { id: booking.patientId },
        select: { userId: true },
      });
      if (patient) {
        await this.notifications.createNotification({
          userId: patient.userId,
          type: 'reminder',
          title: 'Appointment Tomorrow',
          message: `Your ${booking.serviceName || 'appointment'} with ${booking.providerName} is tomorrow at ${booking.scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          referenceId: booking.id,
          referenceType: 'service_booking',
        }).catch(() => {});
      }
    }

    // ─── 1h reminders (within 15-min window) ────────────────────────────
    const upcoming1h = await this.prisma.serviceBooking.findMany({
      where: {
        status: { in: ['confirmed', 'accepted'] },
        scheduledAt: {
          gte: new Date(in1h.getTime() - 15 * 60 * 1000),
          lte: in1h,
        },
      },
      select: {
        id: true,
        patientId: true,
        providerUserId: true,
        providerName: true,
        scheduledAt: true,
        serviceName: true,
      },
    });

    for (const booking of upcoming1h) {
      const patient = await this.prisma.patientProfile.findUnique({
        where: { id: booking.patientId },
        select: { userId: true },
      });
      if (patient) {
        // Notify patient
        await this.notifications.createNotification({
          userId: patient.userId,
          type: 'reminder',
          title: 'Appointment in 1 Hour',
          message: `Your ${booking.serviceName || 'appointment'} with ${booking.providerName} starts in 1 hour`,
          referenceId: booking.id,
          referenceType: 'service_booking',
        }).catch(() => {});

        // Notify provider
        await this.notifications.createNotification({
          userId: booking.providerUserId,
          type: 'reminder',
          title: 'Upcoming Appointment',
          message: `You have an appointment in 1 hour`,
          referenceId: booking.id,
          referenceType: 'service_booking',
        }).catch(() => {});
      }
    }

    if (upcoming24h.length + upcoming1h.length > 0) {
      this.logger.log(`Sent ${upcoming24h.length} 24h reminders + ${upcoming1h.length} 1h reminders`);
    }
  }
}
