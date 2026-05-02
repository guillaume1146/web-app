import { Test, TestingModule } from '@nestjs/testing';
import { HealthStreakService } from './health-streak.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthStreakService', () => {
  let service: HealthStreakService;
  let prisma: any;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = (() => {
    const d = new Date(); d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const twoDaysAgo = (() => {
    const d = new Date(); d.setUTCDate(d.getUTCDate() - 2);
    return d.toISOString().slice(0, 10);
  })();

  beforeEach(async () => {
    prisma = {
      healthStreak: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthStreakService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(HealthStreakService);
  });

  describe('get', () => {
    it('returns zeros when no row exists', async () => {
      prisma.healthStreak.findUnique.mockResolvedValueOnce(null);
      const res = await service.get('U1');
      expect(res).toEqual({
        currentStreak: 0, longestStreak: 0, lastCheckInDate: null, checkedInToday: false,
      });
    });

    it('reports checkedInToday: true when lastCheckInDate is today', async () => {
      prisma.healthStreak.findUnique.mockResolvedValueOnce({
        currentStreak: 3, longestStreak: 5, lastCheckInDate: today,
      });
      const res = await service.get('U1');
      expect(res.checkedInToday).toBe(true);
      expect(res.currentStreak).toBe(3);
    });
  });

  describe('checkIn', () => {
    it('starts a fresh streak at 1 when no row exists', async () => {
      prisma.healthStreak.findUnique.mockResolvedValueOnce(null);
      prisma.healthStreak.upsert.mockResolvedValueOnce({
        currentStreak: 1, longestStreak: 1, lastCheckInDate: today,
      });
      const res = await service.checkIn('U1');
      expect(res.currentStreak).toBe(1);
      expect(res.alreadyCheckedIn).toBe(false);
    });

    it('extends the streak when yesterday was logged', async () => {
      prisma.healthStreak.findUnique.mockResolvedValueOnce({
        currentStreak: 4, longestStreak: 4, lastCheckInDate: yesterday,
      });
      prisma.healthStreak.upsert.mockResolvedValueOnce({
        currentStreak: 5, longestStreak: 5, lastCheckInDate: today,
      });
      const res = await service.checkIn('U1');
      expect(res.currentStreak).toBe(5);
      expect(res.longestStreak).toBe(5);
    });

    it('resets streak to 1 when last check-in is older than yesterday', async () => {
      prisma.healthStreak.findUnique.mockResolvedValueOnce({
        currentStreak: 10, longestStreak: 12, lastCheckInDate: twoDaysAgo,
      });
      prisma.healthStreak.upsert.mockResolvedValueOnce({
        currentStreak: 1, longestStreak: 12, lastCheckInDate: today,
      });
      const res = await service.checkIn('U1');
      expect(res.currentStreak).toBe(1);
      // Longest record is preserved.
      expect(res.longestStreak).toBe(12);
    });

    it('is idempotent on same day (no-op with alreadyCheckedIn: true)', async () => {
      prisma.healthStreak.findUnique.mockResolvedValueOnce({
        currentStreak: 3, longestStreak: 5, lastCheckInDate: today,
      });
      const res = await service.checkIn('U1');
      expect(res.alreadyCheckedIn).toBe(true);
      expect(prisma.healthStreak.upsert).not.toHaveBeenCalled();
    });
  });
});
