import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkflowInstanceRepository } from './repositories/workflow-instance.repository';
import { WorkflowStepLogRepository } from './repositories/workflow-step-log.repository';
import { WorkflowRegistry } from './workflow-registry';
import { WorkflowNotificationResolver } from './notification-resolver';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const STEPS = [
  {
    order: 1, statusCode: 'pending', label: 'Pending', flags: {},
    actionsForPatient: [{ action: 'cancel', label: 'Cancel', targetStatus: 'cancelled', style: 'danger' }],
    actionsForProvider: [{ action: 'accept', label: 'Accept', targetStatus: 'confirmed', style: 'primary' }],
  },
  {
    order: 2, statusCode: 'confirmed', label: 'Confirmed', flags: {},
    actionsForPatient: [],
    actionsForProvider: [{ action: 'complete', label: 'Complete', targetStatus: 'completed', style: 'primary' }],
  },
  {
    order: 3, statusCode: 'completed', label: 'Completed', flags: {},
    actionsForPatient: [], actionsForProvider: [],
  },
  {
    order: 4, statusCode: 'cancelled', label: 'Cancelled', flags: {},
    actionsForPatient: [], actionsForProvider: [],
  },
];

const TRANSITIONS = [
  { from: 'pending', to: 'confirmed', action: 'accept', allowedRoles: ['provider'] },
  { from: 'pending', to: 'cancelled', action: 'cancel', allowedRoles: ['patient', 'provider'] },
  { from: 'confirmed', to: 'completed', action: 'complete', allowedRoles: ['provider'] },
];

const TEMPLATE = {
  id: 'TPL001', name: 'Test Template', providerType: 'DOCTOR', serviceMode: 'office',
  steps: STEPS, transitions: TRANSITIONS,
};

const INSTANCE = {
  id: 'INST001', bookingId: 'BOOK001', bookingType: 'service_booking',
  providerUserId: 'DOC001', patientUserId: 'PAT001',
  currentStatus: 'pending', templateId: 'TPL001',
  serviceMode: 'office', metadata: {},
  startedAt: new Date(), completedAt: null, cancelledAt: null,
  templateSnapshot: null,
  template: TEMPLATE,
};

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  workflowInstance: { findUnique: jest.fn(), update: jest.fn() },
  serviceBooking: { findUnique: jest.fn(), update: jest.fn() },
  appointment: { update: jest.fn() },
  nurseBooking: { update: jest.fn() },
  bookedSlot: { upsert: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({}) },
  user: { findUnique: jest.fn() },
  providerRole: { findUnique: jest.fn() },
  platformService: { findUnique: jest.fn() },
  $transaction: jest.fn((fn: any) => fn(mockPrisma)),
};

const mockNotifications = { createNotification: jest.fn().mockResolvedValue({ id: 'NOTIF001' }) };
const mockInstanceRepo = {
  findById: jest.fn(),
  findByBooking: jest.fn(),
  updateStatus: jest.fn().mockResolvedValue({ ...INSTANCE }),
  create: jest.fn().mockResolvedValue({ ...INSTANCE }),
};
const mockStepLogRepo = {
  create: jest.fn().mockResolvedValue({}),
  findByInstance: jest.fn().mockResolvedValue([]),
};
const mockRegistry = { resolveTemplate: jest.fn() };
const mockNotificationResolver = {
  buildVariables: jest.fn().mockResolvedValue({
    patientName: 'Test Patient', providerName: 'Test Provider', serviceName: 'Test Service',
    scheduledAt: 'Tomorrow', amount: '500', status: 'confirmed', bookingId: 'BOOK001',
    actionBy: 'provider', eta: '',
  }),
  resolve: jest.fn().mockReturnValue({ title: 'Update', message: 'Status changed', type: 'booking_update' }),
};
const mockFlagHandlers = new Map();

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowEngineService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: WorkflowInstanceRepository, useValue: mockInstanceRepo },
        { provide: WorkflowStepLogRepository, useValue: mockStepLogRepo },
        { provide: WorkflowRegistry, useValue: mockRegistry },
        { provide: WorkflowNotificationResolver, useValue: mockNotificationResolver },
        { provide: 'STEP_FLAG_HANDLERS', useValue: mockFlagHandlers },
      ],
    }).compile();

    service = module.get<WorkflowEngineService>(WorkflowEngineService);
    jest.clearAllMocks();
    // Re-apply defaults cleared by clearAllMocks
    mockInstanceRepo.updateStatus.mockResolvedValue({ ...INSTANCE });
    mockStepLogRepo.create.mockResolvedValue({});
    mockNotifications.createNotification.mockResolvedValue({ id: 'NOTIF001' });
    mockNotificationResolver.buildVariables.mockResolvedValue({
      patientName: 'Test Patient', providerName: 'Test Provider', serviceName: 'Test Service',
      scheduledAt: 'Tomorrow', amount: '500', status: 'confirmed', bookingId: 'BOOK001',
      actionBy: 'provider', eta: '',
    });
    mockNotificationResolver.resolve.mockReturnValue({ title: 'Update', message: 'Status changed', type: 'booking_update' });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── transition ────────────────────────────────────────────────────────────

  describe('transition()', () => {
    beforeEach(() => {
      mockInstanceRepo.findById.mockResolvedValue({ ...INSTANCE });
      mockInstanceRepo.updateStatus.mockResolvedValue({ ...INSTANCE, currentStatus: 'confirmed' });
      mockPrisma.serviceBooking.findUnique.mockResolvedValue({ id: 'BOOK001' });
      mockPrisma.serviceBooking.update.mockResolvedValue({});
    });

    it('throws BadRequestException when instance not found', async () => {
      mockInstanceRepo.findById.mockResolvedValue(null);
      await expect(service.transition({
        instanceId: 'GHOST', action: 'accept', actionByRole: 'provider', actionByUserId: 'DOC001',
      })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for invalid transition', async () => {
      await expect(service.transition({
        instanceId: 'INST001', action: 'complete', actionByRole: 'provider', actionByUserId: 'DOC001',
      })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when role not allowed', async () => {
      await expect(service.transition({
        instanceId: 'INST001', action: 'accept', actionByRole: 'patient', actionByUserId: 'PAT001',
      })).rejects.toThrow(BadRequestException);
    });

    it('succeeds and updates instance status on valid transition', async () => {
      const result = await service.transition({
        instanceId: 'INST001', action: 'accept', actionByRole: 'provider', actionByUserId: 'DOC001',
      });
      expect(result.success).toBe(true);
      expect(result.currentStatus).toBe('confirmed');
      expect(mockInstanceRepo.updateStatus).toHaveBeenCalledWith(
        'INST001',
        expect.objectContaining({ currentStatus: 'confirmed' }),
      );
    });

    it('creates a step log entry on every transition', async () => {
      await service.transition({
        instanceId: 'INST001', action: 'accept', actionByRole: 'provider', actionByUserId: 'DOC001',
      });
      expect(mockStepLogRepo.create).toHaveBeenCalled();
    });

    it('emits a notification on every transition', async () => {
      await service.transition({
        instanceId: 'INST001', action: 'accept', actionByRole: 'provider', actionByUserId: 'DOC001',
      });
      expect(mockNotifications.createNotification).toHaveBeenCalled();
    });

    it('patient can cancel from pending', async () => {
      mockInstanceRepo.updateStatus.mockResolvedValue({ ...INSTANCE, currentStatus: 'cancelled' });
      const result = await service.transition({
        instanceId: 'INST001', action: 'cancel', actionByRole: 'patient', actionByUserId: 'PAT001',
      });
      expect(result.success).toBe(true);
      expect(result.currentStatus).toBe('cancelled');
    });

    // ─── Template-level systematic pre-flight ──────────────────────────────

    it('blocks acceptance when serviceConfig requires "db:prescription" and handler rejects', async () => {
      const rxValidate = jest.fn().mockResolvedValue({ valid: false, errors: ['A valid prescription is required'] });
      mockFlagHandlers.set('requires_prescription', { flag: 'requires_prescription', validate: rxValidate });

      const instanceWithRx = {
        ...INSTANCE,
        template: { ...TEMPLATE, serviceConfig: { preflight: { requires: ['db:prescription'] } } },
      };
      mockInstanceRepo.findById.mockResolvedValue(instanceWithRx);

      await expect(service.transition({
        instanceId: 'INST001', action: 'accept', actionByRole: 'provider', actionByUserId: 'DOC001',
      })).rejects.toThrow(BadRequestException);

      expect(rxValidate).toHaveBeenCalled();
      mockFlagHandlers.delete('requires_prescription');
    });

    it('allows acceptance when serviceConfig requires "db:prescription" and prescription exists', async () => {
      const rxValidate = jest.fn().mockResolvedValue({ valid: true, errors: [] });
      mockFlagHandlers.set('requires_prescription', { flag: 'requires_prescription', validate: rxValidate });

      const instanceWithRx = {
        ...INSTANCE,
        template: { ...TEMPLATE, serviceConfig: { preflight: { requires: ['db:prescription'] } } },
      };
      mockInstanceRepo.findById.mockResolvedValue(instanceWithRx);

      const result = await service.transition({
        instanceId: 'INST001', action: 'accept', actionByRole: 'provider', actionByUserId: 'DOC001',
      });
      expect(result.success).toBe(true);
      expect(rxValidate).toHaveBeenCalled();
      mockFlagHandlers.delete('requires_prescription');
    });

    it('blocks acceptance when serviceConfig requires "input:lab_result" but no content in input', async () => {
      const contentValidate = jest.fn().mockResolvedValue({ valid: false, errors: ['Content of type "lab_result" is required'] });
      mockFlagHandlers.set('requires_content', { flag: 'requires_content', validate: contentValidate });

      const instanceWithContent = {
        ...INSTANCE,
        template: { ...TEMPLATE, serviceConfig: { preflight: { requires: ['input:lab_result'] } } },
      };
      mockInstanceRepo.findById.mockResolvedValue(instanceWithContent);

      await expect(service.transition({
        instanceId: 'INST001', action: 'accept', actionByRole: 'provider', actionByUserId: 'DOC001',
      })).rejects.toThrow(BadRequestException);

      expect(contentValidate).toHaveBeenCalled();
      const ctxArg = contentValidate.mock.calls[0][0];
      expect(ctxArg.flags.requires_content).toBe('lab_result');
      mockFlagHandlers.delete('requires_content');
    });

    it('does NOT run serviceConfig pre-flight on non-accept actions (cancel)', async () => {
      const rxValidate = jest.fn().mockResolvedValue({ valid: false, errors: ['No prescription'] });
      mockFlagHandlers.set('requires_prescription', { flag: 'requires_prescription', validate: rxValidate });

      const instanceWithRx = {
        ...INSTANCE,
        template: { ...TEMPLATE, serviceConfig: { preflight: { requires: ['db:prescription'] } } },
      };
      mockInstanceRepo.findById.mockResolvedValue(instanceWithRx);
      mockInstanceRepo.updateStatus.mockResolvedValue({ ...INSTANCE, currentStatus: 'cancelled' });

      const result = await service.transition({
        instanceId: 'INST001', action: 'cancel', actionByRole: 'patient', actionByUserId: 'PAT001',
      });
      expect(result.success).toBe(true);
      expect(rxValidate).not.toHaveBeenCalled();
      mockFlagHandlers.delete('requires_prescription');
    });

    it('deducts Health Shop stock at completion when serviceConfig.stock.subtractOnCompletion = true', async () => {
      const subtractExecute = jest.fn().mockResolvedValue({ stockSubtracted: [{ itemId: 'ITEM001', newQuantity: 9 }] });
      mockFlagHandlers.set('triggers_stock_subtract', { flag: 'triggers_stock_subtract', execute: subtractExecute });

      const confirmInstance = {
        ...INSTANCE,
        currentStatus: 'confirmed',
        template: { ...TEMPLATE, serviceConfig: { stock: { subtractOnCompletion: true } } },
        metadata: { inventoryItems: [{ itemId: 'ITEM001', quantity: 1 }] },
      };
      mockInstanceRepo.findById.mockResolvedValue(confirmInstance);
      mockInstanceRepo.updateStatus.mockResolvedValue({ ...confirmInstance, currentStatus: 'completed' });

      const result = await service.transition({
        instanceId: 'INST001', action: 'complete', actionByRole: 'provider', actionByUserId: 'DOC001',
      });
      expect(result.success).toBe(true);
      expect(subtractExecute).toHaveBeenCalled();
      expect(result.triggeredActions?.stockSubtracted).toBeDefined();
      mockFlagHandlers.delete('triggers_stock_subtract');
    });
  });

  // ─── getState ──────────────────────────────────────────────────────────────

  describe('getState()', () => {
    it('returns null when instance not found', async () => {
      mockInstanceRepo.findById.mockResolvedValue(null);
      const state = await service.getState('GHOST');
      expect(state).toBeNull();
    });

    it('returns workflow state with currentStatus and available actions', async () => {
      mockInstanceRepo.findById.mockResolvedValue({ ...INSTANCE, currentStatus: 'pending' });
      const state = await service.getState('INST001');
      expect(state).not.toBeNull();
      expect(state?.currentStatus).toBe('pending');
      expect(state?.actionsForProvider).toHaveLength(1);
      expect(state?.actionsForProvider[0].action).toBe('accept');
    });
  });
});
