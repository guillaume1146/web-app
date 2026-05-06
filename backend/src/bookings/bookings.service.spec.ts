import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockPrisma = {
  user: { findUnique: jest.fn() },
  patientProfile: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  serviceBooking: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn().mockResolvedValue({}) },
  appointment: { findMany: jest.fn(), update: jest.fn() },
  nurseBooking: { findMany: jest.fn(), update: jest.fn() },
  childcareBooking: { findMany: jest.fn(), update: jest.fn() },
  labTestBooking: { findMany: jest.fn(), update: jest.fn() },
  emergencyBooking: { findMany: jest.fn(), update: jest.fn() },
  workflowInstance: { findMany: jest.fn() },
  userWallet: { findUnique: jest.fn() },
  providerAvailability: { findMany: jest.fn() },
  providerServiceConfig: { findFirst: jest.fn() },
  platformService: { findFirst: jest.fn() },
  providerRole: { findUnique: jest.fn() },
  bookedSlot: { findMany: jest.fn().mockResolvedValue([]) },
};

const mockNotifications = { createNotification: jest.fn().mockResolvedValue({}) };
const mockWorkflowEngine = {
  attachWorkflow: jest.fn().mockResolvedValue({ workflowInstanceId: null }),
  transition: jest.fn(),
};

describe('BookingsService', () => {
  let service: BookingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: WorkflowEngineService, useValue: mockWorkflowEngine },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createBooking ──────────────────────────────────────────────────────

  describe('createBooking', () => {
    const patientUserId = 'PAT001';
    const baseData = {
      providerUserId: 'DOC001',
      providerType: 'DOCTOR',
      scheduledDate: '2026-05-01',
      scheduledTime: '10:00',
      reason: 'Checkup',
      serviceName: 'General Consultation',
    };

    const mockProvider = {
      id: 'DOC001', firstName: 'Dr', lastName: 'Smith',
      userType: 'DOCTOR', regionId: 'MU', phone: '+230123', verified: true,
    };

    it('should create a ServiceBooking and return booking + workflowInstanceId', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockProvider);
      mockPrisma.patientProfile.findUnique.mockResolvedValue({ id: 'PROF-PAT001' });
      mockPrisma.providerServiceConfig.findFirst.mockResolvedValue(null);
      mockPrisma.platformService.findFirst.mockResolvedValue({ defaultPrice: 500 });
      mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 1000 });
      mockPrisma.serviceBooking.create.mockResolvedValue({ id: 'SB001', status: 'pending' });
      mockWorkflowEngine.attachWorkflow.mockResolvedValue({ workflowInstanceId: 'WF001' });

      const result = await service.createBooking(patientUserId, baseData);

      expect(result.booking).toEqual({ id: 'SB001', status: 'pending' });
      expect(result.workflowInstanceId).toBe('WF001');
      expect(mockPrisma.serviceBooking.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.serviceBooking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId: 'PROF-PAT001',
            providerUserId: 'DOC001',
            providerType: 'DOCTOR',
            status: 'pending',
            providerName: 'Dr Smith',
          }),
        }),
      );
    });

    it('should attach workflow with correct params', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockProvider);
      mockPrisma.patientProfile.findUnique.mockResolvedValue({ id: 'PROF-PAT001' });
      mockPrisma.providerServiceConfig.findFirst.mockResolvedValue(null);
      mockPrisma.platformService.findFirst.mockResolvedValue({ defaultPrice: 500 });
      mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 1000 });
      mockPrisma.serviceBooking.create.mockResolvedValue({ id: 'SB001', status: 'pending' });
      mockWorkflowEngine.attachWorkflow.mockResolvedValue({ workflowInstanceId: 'WF001' });

      await service.createBooking(patientUserId, baseData);

      expect(mockWorkflowEngine.attachWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 'SB001',
          bookingRoute: 'service',
          patientUserId,
          providerUserId: 'DOC001',
          providerType: 'DOCTOR',
          servicePrice: 500,
          regionCode: 'MU',
        }),
      );
    });

    it('should throw NotFoundException when provider does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.createBooking(patientUserId, baseData)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when wallet balance is insufficient', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockProvider);
      mockPrisma.patientProfile.findUnique.mockResolvedValue({ id: 'PROF-PAT001' });
      mockPrisma.providerServiceConfig.findFirst.mockResolvedValue(null);
      mockPrisma.platformService.findFirst.mockResolvedValue({ defaultPrice: 500 });
      mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 100 });

      await expect(service.createBooking(patientUserId, baseData)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when wallet does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockProvider);
      mockPrisma.patientProfile.findUnique.mockResolvedValue({ id: 'PROF-PAT001' });
      mockPrisma.providerServiceConfig.findFirst.mockResolvedValue(null);
      mockPrisma.platformService.findFirst.mockResolvedValue({ defaultPrice: 500 });
      mockPrisma.userWallet.findUnique.mockResolvedValue(null);

      await expect(service.createBooking(patientUserId, baseData)).rejects.toThrow(BadRequestException);
    });

    it('should auto-create patient profile if one does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockProvider);
      mockPrisma.patientProfile.findUnique.mockResolvedValue(null);
      mockPrisma.patientProfile.create.mockResolvedValue({ id: 'NEW-PROF' });
      mockPrisma.providerServiceConfig.findFirst.mockResolvedValue(null);
      mockPrisma.platformService.findFirst.mockResolvedValue(null);
      mockPrisma.providerRole.findUnique.mockResolvedValue(null);
      // fee = 0 so no wallet check
      mockPrisma.serviceBooking.create.mockResolvedValue({ id: 'SB002', status: 'pending' });
      mockWorkflowEngine.attachWorkflow.mockResolvedValue({ workflowInstanceId: 'WF002' });

      await service.createBooking(patientUserId, baseData);

      expect(mockPrisma.patientProfile.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.serviceBooking.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ patientId: 'NEW-PROF' }) }),
      );
    });

    it('throws BadRequestException when no workflow template found (missing configuration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockProvider);
      mockPrisma.patientProfile.findUnique.mockResolvedValue({ id: 'PROF-PAT001' });
      mockPrisma.providerServiceConfig.findFirst.mockResolvedValue(null);
      mockPrisma.platformService.findFirst.mockResolvedValue(null);
      mockPrisma.providerRole.findUnique.mockResolvedValue(null);
      mockPrisma.serviceBooking.create.mockResolvedValue({ id: 'SB003', status: 'pending' });
      mockWorkflowEngine.attachWorkflow.mockResolvedValue({ workflowInstanceId: undefined });

      await expect(service.createBooking(patientUserId, baseData)).rejects.toThrow(BadRequestException);
    });

    it('should skip wallet check when ProviderRole.skipWalletCheck is true (DB-driven)', async () => {
      const emgProvider = {
        id: 'EMG001', firstName: 'Resp', lastName: 'One',
        userType: 'EMERGENCY_WORKER', regionId: 'MU', phone: '+230999', verified: true,
      };
      mockPrisma.user.findUnique.mockResolvedValue(emgProvider);
      mockPrisma.patientProfile.findUnique.mockResolvedValue({ id: 'PROF-PAT001' });
      mockPrisma.providerServiceConfig.findFirst.mockResolvedValue(null);
      mockPrisma.platformService.findFirst.mockResolvedValue({ defaultPrice: 1000 });
      mockPrisma.providerRole.findUnique.mockResolvedValue({ skipWalletCheck: true });
      mockPrisma.serviceBooking.create.mockResolvedValue({ id: 'SB004', status: 'pending' });
      mockWorkflowEngine.attachWorkflow.mockResolvedValue({ workflowInstanceId: 'WF004' });

      await service.createBooking(patientUserId, {
        ...baseData, providerUserId: 'EMG001', providerType: 'EMERGENCY_WORKER',
      });

      expect(mockPrisma.userWallet.findUnique).not.toHaveBeenCalled();
    });

    it('should use ProviderServiceConfig price when available', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockProvider);
      mockPrisma.patientProfile.findUnique.mockResolvedValue({ id: 'PROF-PAT001' });
      mockPrisma.providerServiceConfig.findFirst.mockResolvedValue({
        priceOverride: 750,
        platformService: { defaultPrice: 500 },
      });
      mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 2000 });
      mockPrisma.serviceBooking.create.mockResolvedValue({ id: 'SB005', status: 'pending' });
      mockWorkflowEngine.attachWorkflow.mockResolvedValue({ workflowInstanceId: 'WF005' });

      await service.createBooking(patientUserId, baseData);

      expect(mockPrisma.serviceBooking.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ servicePrice: 750 }) }),
      );
    });

    it('ignores client-supplied servicePrice and always resolves server-side', async () => {
      // The client used to be able to pass `servicePrice` and dictate the charge.
      // Audit (Apr 2026) flagged this as a critical money-flow hole — server must
      // always resolve the price from ProviderServiceConfig / PlatformService /
      // ProviderRole.defaultBookingFee. Keep this assertion to prevent regression.
      mockPrisma.user.findUnique.mockResolvedValue(mockProvider);
      mockPrisma.patientProfile.findUnique.mockResolvedValue({ id: 'PROF-PAT001' });
      mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 5000 });
      mockPrisma.serviceBooking.create.mockResolvedValue({ id: 'SB006', status: 'pending' });
      mockWorkflowEngine.attachWorkflow.mockResolvedValue({ workflowInstanceId: 'WF006' });

      await service.createBooking(patientUserId, { ...baseData, servicePrice: 1200 });

      // Stored price comes from the DB resolver (750), NOT the client's 1200.
      expect(mockPrisma.serviceBooking.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ servicePrice: 750 }) }),
      );
      // Server-side resolver WAS consulted — we don't trust the client.
      expect(mockPrisma.providerServiceConfig.findFirst).toHaveBeenCalled();
    });

    it('should fall back to ProviderRole.defaultBookingFee when no service config or platform service', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockProvider);
      mockPrisma.patientProfile.findUnique.mockResolvedValue({ id: 'PROF-PAT001' });
      mockPrisma.providerServiceConfig.findFirst.mockResolvedValue(null);
      mockPrisma.platformService.findFirst.mockResolvedValue(null);
      mockPrisma.providerRole.findUnique.mockResolvedValue({ defaultBookingFee: 300 });
      mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 500 });
      mockPrisma.serviceBooking.create.mockResolvedValue({ id: 'SB007', status: 'pending' });
      mockWorkflowEngine.attachWorkflow.mockResolvedValue({ workflowInstanceId: 'WF007' });

      await service.createBooking(patientUserId, baseData);

      expect(mockPrisma.serviceBooking.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ servicePrice: 300 }) }),
      );
    });
  });

  // ─── getUnified ─────────────────────────────────────────────────────────

  describe('getUnified', () => {
    describe('role=patient', () => {
      it('should return bookings from all tables with correct bookingType tags', async () => {
        mockPrisma.patientProfile.findUnique.mockResolvedValue({ id: 'PROF-PAT001' });
        mockPrisma.serviceBooking.findMany.mockResolvedValue([
          { id: 'SB1', scheduledAt: new Date('2026-05-01'), status: 'pending' },
        ]);
        mockPrisma.appointment.findMany.mockResolvedValue([
          { id: 'APT1', scheduledAt: new Date('2026-04-01'), status: 'confirmed' },
        ]);
        mockPrisma.nurseBooking.findMany.mockResolvedValue([]);
        mockPrisma.childcareBooking.findMany.mockResolvedValue([]);
        mockPrisma.labTestBooking.findMany.mockResolvedValue([]);
        mockPrisma.emergencyBooking.findMany.mockResolvedValue([]);

        const result = await service.getUnified('PAT001', 'patient');

        expect(result.data).toHaveLength(2);
        expect(result.data.find((r: any) => r.id === 'SB1')?.bookingType).toBe('service_booking');
        expect(result.data.find((r: any) => r.id === 'APT1')?.bookingType).toBe('appointment');
      });

      it('should return empty array when patient has no profile', async () => {
        mockPrisma.patientProfile.findUnique.mockResolvedValue(null);

        const result = await service.getUnified('PAT999', 'patient');

        expect(result.data).toEqual([]);
        expect(result.total).toBe(0);
      });

      it('should query all legacy tables for historical data', async () => {
        mockPrisma.patientProfile.findUnique.mockResolvedValue({ id: 'PROF-PAT001' });
        mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
        mockPrisma.appointment.findMany.mockResolvedValue([]);
        mockPrisma.nurseBooking.findMany.mockResolvedValue([{ id: 'NB1', scheduledAt: new Date() }]);
        mockPrisma.childcareBooking.findMany.mockResolvedValue([{ id: 'CB1', scheduledAt: new Date() }]);
        mockPrisma.labTestBooking.findMany.mockResolvedValue([{ id: 'LB1', scheduledAt: new Date() }]);
        mockPrisma.emergencyBooking.findMany.mockResolvedValue([{ id: 'EB1', createdAt: new Date() }]);

        const result = await service.getUnified('PAT001', 'patient');

        expect(result.data).toHaveLength(4);
        const types = result.data.map((r: any) => r.bookingType);
        expect(types).toContain('nurse_booking');
        expect(types).toContain('childcare_booking');
        expect(types).toContain('lab_test_booking');
        expect(types).toContain('emergency_booking');
      });
    });

    describe('role=provider', () => {
      it('should return enriched data with patient names', async () => {
        mockPrisma.workflowInstance.findMany.mockResolvedValue([
          {
            id: 'WF1', bookingId: 'SB1', bookingType: 'service_booking',
            currentStatus: 'pending', createdAt: new Date(), updatedAt: new Date(),
            template: { name: 'Doctor Consultation', providerType: 'DOCTOR' },
          },
        ]);
        mockPrisma.serviceBooking.findMany.mockResolvedValue([
          {
            id: 'SB1', patientId: 'PROF-PAT001', scheduledAt: new Date(),
            serviceName: 'Checkup', type: 'in_person', duration: 30,
            servicePrice: 500, providerType: 'DOCTOR', reason: 'Checkup',
          },
        ]);
        mockPrisma.patientProfile.findMany.mockResolvedValue([
          { id: 'PROF-PAT001', user: { firstName: 'John', lastName: 'Doe', profileImage: null } },
        ]);

        const result = await service.getUnified('DOC001', 'provider');

        expect(result.data).toHaveLength(1);
        expect(result.data[0].patientName).toBe('John Doe');
        expect(result.data[0].templateName).toBe('Doctor Consultation');
        expect(result.data[0].workflowInstanceId).toBe('WF1');
        expect(result.data[0].price).toBe(500);
      });

      it('should handle missing ServiceBooking gracefully', async () => {
        mockPrisma.workflowInstance.findMany.mockResolvedValue([
          {
            id: 'WF1', bookingId: 'MISSING', bookingType: 'service_booking',
            currentStatus: 'pending', createdAt: new Date(), updatedAt: new Date(),
            template: { name: 'Template', providerType: 'DOCTOR' },
          },
        ]);
        mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
        mockPrisma.patientProfile.findMany.mockResolvedValue([]);

        const result = await service.getUnified('DOC001', 'provider');

        expect(result.data).toHaveLength(1);
        // When ServiceBooking is missing, values may be undefined or fallbacks
        expect(result.data[0].patientName === undefined || typeof result.data[0].patientName === 'string').toBe(true);
      });
    });
  });

  // ─── cancel ─────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('should cancel via workflow transition when possible', async () => {
      mockWorkflowEngine.transition.mockResolvedValue({ success: true, currentStatus: 'cancelled' });

      const result = await service.cancel('PAT001', 'SB001', 'service_booking');

      expect(result).toEqual({ success: true, currentStatus: 'cancelled' });
      expect(mockWorkflowEngine.transition).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 'SB001',
          bookingType: 'service_booking',
          action: 'cancel',
          actionByUserId: 'PAT001',
          actionByRole: 'patient',
        }),
      );
    });

    it('should fall back to direct ServiceBooking cancel when workflow fails', async () => {
      mockWorkflowEngine.transition.mockRejectedValue(new Error('No workflow'));
      mockPrisma.serviceBooking.findUnique.mockResolvedValue({ id: 'SB001' });
      mockPrisma.serviceBooking.update.mockResolvedValue({ id: 'SB001', status: 'cancelled' });

      const result = await service.cancel('PAT001', 'SB001', 'service_booking');

      expect(result).toEqual({ success: true, message: 'Booking cancelled' });
      expect(mockPrisma.serviceBooking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'SB001' },
          data: expect.objectContaining({ status: 'cancelled', cancelledBy: 'PAT001' }),
        }),
      );
    });

    it('should fall back to legacy model cancel when ServiceBooking not found', async () => {
      mockWorkflowEngine.transition.mockRejectedValue(new Error('No workflow'));
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(null);

      const result = await service.cancel('PAT001', 'APT001', 'appointment');

      expect(result).toEqual({ success: true, message: 'Booking cancelled' });
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'APT001' },
          data: { status: 'cancelled' },
        }),
      );
    });
  });

  // ─── getAvailableSlots ─────────────────────────────────────────────────

  describe('getAvailableSlots', () => {
    it('should return available start times for the given date', async () => {
      mockPrisma.providerAvailability.findMany.mockResolvedValue([
        { startTime: '09:00', endTime: '12:00' },
        { startTime: '14:00', endTime: '17:00' },
      ]);
      // No booked slots
      mockPrisma.bookedSlot.findMany.mockResolvedValue([]);

      // 2026-05-04 is a Monday (dayOfWeek = 1)
      const result = await service.getAvailableSlots('DOC001', '2026-05-04');

      // Service returns start-time strings in 30-min increments:
      // 09:00..11:30 (6 slots) + 14:00..16:30 (6 slots) = 12 slots
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBe('09:00');
      expect(result).toContain('14:00');
      expect(mockPrisma.providerAvailability.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'DOC001', isActive: true }),
        }),
      );
    });

    it('should return empty array when no slots are available', async () => {
      mockPrisma.providerAvailability.findMany.mockResolvedValue([]);

      const result = await service.getAvailableSlots('DOC001', '2026-05-04');

      expect(result).toEqual([]);
    });
  });

  // ─── reschedule ────────────────────────────────────────────────────────

  describe('reschedule', () => {
    it('should reschedule a ServiceBooking', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue({ id: 'SB001' });
      mockPrisma.serviceBooking.update.mockResolvedValue({ id: 'SB001' });

      const result = await service.reschedule('PAT001', 'SB001', 'service_booking', '2026-06-01', '14:00');

      expect(result.message).toBe('Booking rescheduled successfully');
      expect(mockPrisma.serviceBooking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'SB001' },
          data: { scheduledAt: expect.any(Date) },
        }),
      );
    });

    it('should throw BadRequestException for invalid legacy booking type', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(null);

      await expect(
        service.reschedule('PAT001', 'X001', 'invalid_type', '2026-06-01', '14:00'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
