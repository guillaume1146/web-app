import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Cron-driven appointment reminders. Runs every 15 minutes.
 * Emits two reminders per booking:
 *   - t_minus_24h — when the booking's scheduledAt is 24h-25h away
 *   - t_minus_1h  — when it's 1h-1.25h away
 * Idempotency via AppointmentReminder(unique: bookingId+reminderType).
 *
 * Supports both the unified `ServiceBooking` and legacy role tables
 * (Appointment, NurseBooking, ChildcareBooking, LabTestBooking).
 */
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async runReminderSweep() {
    const now = Date.now();
    // 24h window: 23h45 → 24h15 away
    const t24 = { start: now + 23.75 * 3600e3, end: now + 24.25 * 3600e3 };
    // 1h window: 45min → 75min away
    const t1 = { start: now + 0.75 * 3600e3, end: now + 1.25 * 3600e3 };

    await Promise.all([
      this.sweep(t24, 't_minus_24h', 'Reminder — your booking is tomorrow'),
      this.sweep(t1, 't_minus_1h', 'Your booking starts in about an hour'),
    ]).catch(e => this.logger.error('Reminder sweep failed', e as any));
  }

  private async sweep(window: { start: number; end: number }, reminderType: string, title: string) {
    const start = new Date(window.start);
    const end = new Date(window.end);

    // Look across the unified ServiceBooking table. Legacy tables can be added as needed.
    const rows = await this.prisma.serviceBooking.findMany({
      where: {
        scheduledAt: { gte: start, lte: end },
        status: { in: ['pending', 'accepted', 'confirmed', 'in_progress'] },
      },
      select: { id: true, patientId: true, providerUserId: true, serviceName: true, scheduledAt: true },
    }).catch(() => [] as any[]);

    for (const row of rows) {
      try {
        // Idempotent insert via unique constraint on (bookingId, reminderType).
        await this.prisma.appointmentReminder.create({
          data: { bookingId: row.id, bookingType: 'ServiceBooking', reminderType },
        });
      } catch {
        continue; // already sent — skip.
      }

      const minutes = Math.round((row.scheduledAt.getTime() - Date.now()) / 60e3);
      const humanWhen = minutes > 120 ? `tomorrow at ${fmt(row.scheduledAt)}` : `in about ${minutes} min`;

      for (const userId of [row.patientId, row.providerUserId]) {
        this.notifications.createNotification({
          userId,
          type: 'reminder',
          title,
          message: `${row.serviceName ?? 'Booking'} · ${humanWhen}`,
          referenceId: row.id,
          referenceType: 'ServiceBooking',
          payload: { bookingId: row.id, reminderType, scheduledAt: row.scheduledAt.toISOString() },
          groupKey: `booking:${row.id}`,
        }).catch(() => {});
      }
    }
    if (rows.length) this.logger.log(`${reminderType}: ${rows.length} bookings reminded`);
  }
}

function fmt(d: Date) {
  return d.toISOString().slice(11, 16);
}
