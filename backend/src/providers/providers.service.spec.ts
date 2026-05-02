import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma: any = {
  user: { findUnique: jest.fn() },
  providerServiceConfig: { findMany: jest.fn() },
  providerAvailability: { findMany: jest.fn() },
  workflowInstance: { findMany: jest.fn(), count: jest.fn() },
  serviceBooking: { findMany: jest.fn() },
  providerReview: { findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn(), create: jest.fn() },
  patientProfile: { findMany: jest.fn() },
  // Dynamic profile tables — accessed via (this.prisma as any)[relation]
  doctorProfile: { findUnique: jest.fn() },
  nurseProfile: { findUnique: jest.fn() },
  nannyProfile: { findUnique: jest.fn() },
  pharmacistProfile: { findUnique: jest.fn() },
  caregiverProfile: { findUnique: jest.fn() },
};

describe('ProvidersService', () => {
  let service: ProvidersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── getProfile ─────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('should return user + profile for a DOCTOR provider', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'DOC001', firstName: 'Dr', lastName: 'Smith', profileImage: null,
        userType: 'DOCTOR', address: 'Port Louis', verified: true,
      });
      mockPrisma.doctorProfile.findUnique.mockResolvedValue({
        id: 'DP001', specialty: ['Cardiology'], rating: 4.5, consultationFee: 1500,
      });

      const result = await service.getProfile('DOC001');

      expect(result).toEqual(expect.objectContaining({
        id: 'DOC001',
        firstName: 'Dr',
        userType: 'DOCTOR',
        profile: expect.objectContaining({ id: 'DP001', specialty: ['Cardiology'] }),
      }));
    });

    it('should return user without profile for dynamic roles', async () => {
      // A user type that has no profile relation mapping (hypothetical new dynamic role)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'DYN001', firstName: 'Dynamic', lastName: 'Role', profileImage: null,
        userType: 'CUSTOM_ROLE', address: null, verified: false,
      });

      const result = await service.getProfile('DYN001');

      // userTypeToProfileRelation won't have 'CUSTOM_ROLE', so returns user only
      expect(result).toEqual(expect.objectContaining({ id: 'DYN001', userType: 'CUSTOM_ROLE' }));
      expect((result as any).profile).toBeUndefined();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('MISSING')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getServices ────────────────────────────────────────────────────────

  describe('getServices', () => {
    it('should return active ProviderServiceConfig entries with platform service data', async () => {
      const configs = [
        {
          id: 'PSC001', providerUserId: 'DOC001', priceOverride: 2000,
          platformService: { id: 'PS001', serviceName: 'Video Consultation', defaultPrice: 1500, duration: 30, category: 'Consultation', description: 'Video call' },
        },
      ];
      mockPrisma.providerServiceConfig.findMany.mockResolvedValue(configs);

      const result = await service.getServices('DOC001');

      expect(result).toEqual(configs);
      expect(mockPrisma.providerServiceConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { providerUserId: 'DOC001', isActive: true },
          include: expect.objectContaining({
            platformService: expect.objectContaining({
              select: expect.objectContaining({ serviceName: true }),
            }),
          }),
        }),
      );
    });

    it('should return empty array when provider has no services configured', async () => {
      mockPrisma.providerServiceConfig.findMany.mockResolvedValue([]);

      const result = await service.getServices('NEW-DOC');

      expect(result).toEqual([]);
    });
  });

  // ─── getSchedule ────────────────────────────────────────────────────────

  describe('getSchedule', () => {
    it('should return active availability sorted by day and time', async () => {
      const availability = [
        { id: 'A1', userId: 'DOC001', dayOfWeek: 1, startTime: '09:00', endTime: '12:00', isActive: true },
        { id: 'A2', userId: 'DOC001', dayOfWeek: 1, startTime: '14:00', endTime: '17:00', isActive: true },
        { id: 'A3', userId: 'DOC001', dayOfWeek: 3, startTime: '09:00', endTime: '12:00', isActive: true },
      ];
      mockPrisma.providerAvailability.findMany.mockResolvedValue(availability);

      const result = await service.getSchedule('DOC001');

      expect(result).toHaveLength(3);
      expect(mockPrisma.providerAvailability.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'DOC001', isActive: true },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        }),
      );
    });
  });

  // ─── getStatistics ──────────────────────────────────────────────────────

  describe('getStatistics', () => {
    it('should return booking counts and unique patient count', async () => {
      mockPrisma.workflowInstance.count
        .mockResolvedValueOnce(20)   // total
        .mockResolvedValueOnce(10)   // completed
        .mockResolvedValueOnce(5)    // pending
        .mockResolvedValueOnce(2);   // cancelled
      mockPrisma.serviceBooking.findMany.mockResolvedValue([
        { patientId: 'P1' }, { patientId: 'P2' }, { patientId: 'P3' },
      ]);

      const result = await service.getStatistics('DOC001');

      expect(result).toEqual({
        total: 20,
        completed: 10,
        pending: 5,
        cancelled: 2,
        totalPatients: 3,
      });
    });

    it('should return zero counts when provider has no bookings', async () => {
      mockPrisma.workflowInstance.count.mockResolvedValue(0);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);

      const result = await service.getStatistics('NEW-DOC');

      expect(result).toEqual({
        total: 0, completed: 0, pending: 0, cancelled: 0, totalPatients: 0,
      });
    });
  });

  // ─── getBookingRequests ────────────────────────────────────────────────

  describe('getBookingRequests', () => {
    it('should return pending/active workflow instances for the provider', async () => {
      const instances = [
        {
          id: 'WF1', bookingId: 'SB1', currentStatus: 'pending',
          cancelledAt: null, completedAt: null, createdAt: new Date(),
          template: { name: 'Doctor Consultation', providerType: 'DOCTOR' },
        },
      ];
      mockPrisma.workflowInstance.findMany.mockResolvedValue(instances);

      const result = await service.getBookingRequests('DOC001');

      expect(result).toEqual(instances);
      expect(mockPrisma.workflowInstance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { providerUserId: 'DOC001', cancelledAt: null, completedAt: null },
        }),
      );
    });

    it('should return empty array when provider has no pending requests', async () => {
      mockPrisma.workflowInstance.findMany.mockResolvedValue([]);

      const result = await service.getBookingRequests('DOC001');

      expect(result).toEqual([]);
    });
  });

  // ─── getReviews ─────────────────────────────────────────────────────────

  describe('getReviews', () => {
    it('should return reviews with average rating and distribution', async () => {
      mockPrisma.providerReview.findMany.mockResolvedValue([
        { id: 'R1', rating: 5, comment: 'Great', reviewerUser: { firstName: 'John', lastName: 'Doe', profileImage: null } },
      ]);
      mockPrisma.providerReview.count.mockResolvedValue(1);
      mockPrisma.providerReview.aggregate.mockResolvedValue({ _avg: { rating: 5 } });
      mockPrisma.providerReview.groupBy.mockResolvedValue([{ rating: 5, _count: 1 }]);

      const result = await service.getReviews('DOC001', {});

      expect(result.reviews).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.averageRating).toBe(5);
      expect(result.ratingDistribution[5]).toBe(1);
    });
  });

  // ─── createReview ──────────────────────────────────────────────────────

  describe('createReview', () => {
    it('should create a review', async () => {
      mockPrisma.providerReview.create.mockResolvedValue({
        id: 'R1', providerUserId: 'DOC001', rating: 4, comment: 'Good',
      });

      const result = await service.createReview('DOC001', 'PAT001', { rating: 4, comment: 'Good' });

      expect(result.rating).toBe(4);
    });

    it('should throw when reviewing yourself', async () => {
      await expect(
        service.createReview('DOC001', 'DOC001', { rating: 5 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
