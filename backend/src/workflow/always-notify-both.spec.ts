import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowNotificationResolver } from './notification-resolver';

/**
 * Contract test: every workflow status change MUST notify both the
 * patient and the provider. Custom copy on the step wins; when either
 * `notifyPatient` or `notifyProvider` is absent the engine MUST auto-fill
 * a generic "Your booking moved to X" so no status change is ever silent.
 *
 * This is the single most load-bearing promise of the workflow engine —
 * if it breaks, members and providers lose sync about bookings. Tested
 * at both flavours of transition: initial creation (`startWorkflow`) and
 * subsequent transitions (`transition`).
 */
describe('WorkflowEngine — always-notify-both-sides invariant', () => {
  let engine: WorkflowEngineService;
  let notifications: { createNotification: jest.Mock };
  let prisma: any;
  let instanceRepo: any;
  let templateRepo: any;
  let stepLogRepo: any;
  let registry: any;

  const buildSteps = (opts: { firstNotifyPatient?: any; firstNotifyProvider?: any }) => ([
    {
      order: 1, statusCode: 'pending',
      label: 'Pending', description: '',
      actionsForPatient: [{ action: 'cancel', label: 'Cancel', targetStatus: 'cancelled', style: 'danger' }],
      actionsForProvider: [{ action: 'accept', label: 'Accept', targetStatus: 'confirmed', style: 'primary' }],
      flags: {},
      notifyPatient: opts.firstNotifyPatient,
      notifyProvider: opts.firstNotifyProvider,
    },
    {
      order: 2, statusCode: 'confirmed', label: 'Confirmed', description: '',
      actionsForPatient: [], actionsForProvider: [],
      flags: {},
      // Deliberately empty — this is the silent-step scenario we guard against.
      notifyPatient: null,
      notifyProvider: null,
    },
    {
      order: 3, statusCode: 'cancelled', label: 'Cancelled', description: '',
      actionsForPatient: [], actionsForProvider: [],
      flags: {},
      notifyPatient: null, notifyProvider: null,
    },
  ]);

  const mockTemplate = (steps: any[]) => ({
    id: 'TPL1', name: 'Test Flow', slug: 'test', createdByProviderId: null,
    steps,
    // Transitions are normally auto-generated from step actions on save;
    // mirror what a published template looks like for the test.
    transitions: [
      { from: 'pending', to: 'confirmed', action: 'accept', allowedRoles: ['provider'] },
      { from: 'pending', to: 'cancelled', action: 'cancel', allowedRoles: ['patient'] },
    ],
  });

  beforeEach(() => {
    notifications = { createNotification: jest.fn().mockResolvedValue({ id: 'N1' }) };
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ firstName: 'Jean', lastName: 'Pierre', userType: 'DOCTOR' }),
      },
      workflowNotificationTemplate: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const resolver = new WorkflowNotificationResolver(prisma);

    instanceRepo = {
      findById: jest.fn(),
      findByBooking: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'I1' }),
      updateStatus: jest.fn(),
    };
    templateRepo = { findMany: jest.fn() };
    stepLogRepo = { create: jest.fn() };
    registry = { resolveTemplate: jest.fn() };

    const strategyHandlers = new Map();

    // Constructor order: prisma, notifications, instanceRepo, stepLogRepo,
    // registry, notificationResolver, flagHandlers.
    engine = new WorkflowEngineService(
      prisma,
      notifications as any,
      instanceRepo,
      stepLogRepo,
      registry,
      resolver,
      strategyHandlers,
    );
    void templateRepo; // not a constructor dep — kept for future seeding if needed
  });

  it('startWorkflow fires BOTH sides when the template has no notifications on the first step', async () => {
    registry.resolveTemplate.mockResolvedValue(mockTemplate(buildSteps({
      firstNotifyPatient: null, firstNotifyProvider: null,
    })));

    const result = await engine.startWorkflow({
      bookingId: 'BK1', bookingType: 'service_booking',
      providerUserId: 'DR1', providerType: 'DOCTOR',
      patientUserId: 'PAT1', serviceMode: 'office',
    });
    expect(result.success).toBe(true);

    const recipients = notifications.createNotification.mock.calls.map((c: any[]) => c[0].userId);
    expect(recipients).toContain('PAT1');
    expect(recipients).toContain('DR1');
    expect(notifications.createNotification).toHaveBeenCalledTimes(2);

    const messages = notifications.createNotification.mock.calls.map((c: any[]) => c[0].message);
    // Both sides get a human-readable fallback referencing the step label.
    expect(messages.every((m: string) => m.includes('Pending'))).toBe(true);
  });

  it('startWorkflow honours custom copy when the template DID author it', async () => {
    registry.resolveTemplate.mockResolvedValue(mockTemplate(buildSteps({
      firstNotifyPatient: { title: 'Demande envoyée', message: 'Votre demande est envoyée à {{providerName}}' },
      firstNotifyProvider: { title: 'Nouvelle demande', message: '{{patientName}} a envoyé une demande' },
    })));

    await engine.startWorkflow({
      bookingId: 'BK1', bookingType: 'service_booking',
      providerUserId: 'DR1', providerType: 'DOCTOR',
      patientUserId: 'PAT1', serviceMode: 'office',
    });
    expect(notifications.createNotification).toHaveBeenCalledTimes(2);
    const calls = notifications.createNotification.mock.calls;
    const patientMsg = calls.find((c: any[]) => c[0].userId === 'PAT1')?.[0].message;
    const providerMsg = calls.find((c: any[]) => c[0].userId === 'DR1')?.[0].message;
    expect(patientMsg).toContain('Jean Pierre'); // interpolated provider name
    expect(providerMsg).toContain('Jean Pierre'); // interpolated patient name (same mock returns same)
  });

  it('transition() fires BOTH sides when the target step is silent in the template', async () => {
    const steps = buildSteps({});
    const instance = {
      id: 'I1', templateId: 'TPL1', patientUserId: 'PAT1', providerUserId: 'DR1',
      bookingId: 'BK1', bookingType: 'service_booking',
      currentStatus: 'pending', previousStatus: null,
      serviceMode: 'office', completedAt: null, cancelledAt: null,
      metadata: {}, templateSnapshot: null,
      template: mockTemplate(steps),
    };
    instanceRepo.findById.mockResolvedValue(instance);

    // The transition() method internally calls `syncBookingStatus` and step-flag
    // strategies. Give them no-ops.
    (engine as any).syncBookingStatus = jest.fn();

    await engine.transition({
      instanceId: 'I1', action: 'accept', actionByUserId: 'DR1', actionByRole: 'provider',
    });

    const recipients = notifications.createNotification.mock.calls.map((c: any[]) => c[0].userId);
    expect(recipients).toContain('PAT1');
    expect(recipients).toContain('DR1');
    expect(notifications.createNotification).toHaveBeenCalledTimes(2);
    const messages = notifications.createNotification.mock.calls.map((c: any[]) => c[0].message);
    expect(messages.every((m: string) => m.includes('Confirmed'))).toBe(true);
  });
});
