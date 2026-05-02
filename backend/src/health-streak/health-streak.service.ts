import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Daily check-in streak counter. Called automatically whenever a user logs
 * food / exercise / water / sleep; can also be called manually via the
 * "check in" button on the health dashboard.
 */
@Injectable()
export class HealthStreakService {
  constructor(private prisma: PrismaService) {}

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private yesterday(): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  async get(userId: string) {
    const row = await this.prisma.healthStreak.findUnique({ where: { userId } });
    if (!row) {
      return { currentStreak: 0, longestStreak: 0, lastCheckInDate: null, checkedInToday: false };
    }
    return {
      currentStreak: row.currentStreak,
      longestStreak: row.longestStreak,
      lastCheckInDate: row.lastCheckInDate,
      checkedInToday: row.lastCheckInDate === this.today(),
    };
  }

  /** Idempotent: calling twice on the same day is a no-op. */
  async checkIn(userId: string) {
    const today = this.today();
    const yesterday = this.yesterday();
    const existing = await this.prisma.healthStreak.findUnique({ where: { userId } });

    // Same-day: no-op, just return current state.
    if (existing?.lastCheckInDate === today) {
      return {
        currentStreak: existing.currentStreak,
        longestStreak: existing.longestStreak,
        lastCheckInDate: existing.lastCheckInDate,
        alreadyCheckedIn: true,
      };
    }

    // Extend streak if last check-in was yesterday, otherwise reset to 1.
    const nextStreak = existing?.lastCheckInDate === yesterday
      ? existing.currentStreak + 1
      : 1;
    const nextLongest = Math.max(existing?.longestStreak ?? 0, nextStreak);

    const updated = await this.prisma.healthStreak.upsert({
      where: { userId },
      update: {
        currentStreak: nextStreak,
        longestStreak: nextLongest,
        lastCheckInDate: today,
      },
      create: {
        userId,
        currentStreak: nextStreak,
        longestStreak: nextLongest,
        lastCheckInDate: today,
      },
    });

    return {
      currentStreak: updated.currentStreak,
      longestStreak: updated.longestStreak,
      lastCheckInDate: updated.lastCheckInDate,
      alreadyCheckedIn: false,
    };
  }
}
