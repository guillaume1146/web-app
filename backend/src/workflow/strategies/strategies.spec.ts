/**
 * Unit tests for workflow step-flag strategies.
 * Each strategy is tested in isolation with a mocked PrismaService.
 */
import { PaymentStrategy } from './payment.strategy';
import { VideoCallStrategy, AudioCallStrategy } from './video-call.strategy';
import { PrescriptionCheckStrategy } from './prescription-check.strategy';
import { ContentAttachmentStrategy } from './content-attachment.strategy';
import { StockCheckStrategy } from './stock-check.strategy';
import type { TransitionContext, TransitionInput, StepFlags } from '../types';

function makeCtx(
  overrides: Partial<Omit<TransitionContext, 'input' | 'flags'> & {
    input?: Partial<TransitionInput>;
    flags?: StepFlags;
  }> = {},
): TransitionContext {
  const { input: inputOverrides = {}, flags = {}, ...rest } = overrides;
  return {
    instanceId: 'INST001',
    templateId: 'TPL001',
    bookingId: 'BOOK001',
    bookingType: 'service_booking',
    patientUserId: 'PAT001',
    providerUserId: 'DOC001',
    fromStatus: 'pending',
    toStatus: 'confirmed',
    action: 'accept',
    flags,
    input: {
      action: 'accept',
      actionByUserId: 'DOC001',
      actionByRole: 'provider',
      ...inputOverrides,
    },
    ...rest,
  };
}

// ─── PaymentStrategy ──────────────────────────────────────────────────────────

describe('PaymentStrategy', () => {
  let strategy: PaymentStrategy;
  let mockPrisma: any;
  let mockInvoiceService: any;
  let mockTreasury: any;

  beforeEach(() => {
    mockPrisma = {
      userWallet: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      workflowInstance: { findUnique: jest.fn() },
      walletTransaction: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(),
    };
    mockInvoiceService = { generateInvoice: jest.fn().mockResolvedValue({}) };
    mockTreasury = { creditPlatformFee: jest.fn().mockResolvedValue({}) };
    strategy = new PaymentStrategy(mockPrisma, mockInvoiceService, mockTreasury);
  });

  it('validate returns valid=true when servicePrice is 0', async () => {
    mockPrisma.workflowInstance.findUnique.mockResolvedValue({ metadata: { servicePrice: 0 } });
    const r = await strategy.validate(makeCtx());
    expect(r.valid).toBe(true);
  });

  it('validate returns valid=false when wallet balance insufficient', async () => {
    mockPrisma.workflowInstance.findUnique.mockResolvedValue({ metadata: { servicePrice: 500 } });
    mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 200 });
    const r = await strategy.validate(makeCtx());
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/insufficient/i);
  });

  it('validate returns valid=true when balance sufficient', async () => {
    mockPrisma.workflowInstance.findUnique.mockResolvedValue({ metadata: { servicePrice: 500 } });
    mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 1000 });
    const r = await strategy.validate(makeCtx());
    expect(r.valid).toBe(true);
  });

  it('execute returns empty object when servicePrice is 0', async () => {
    mockPrisma.workflowInstance.findUnique.mockResolvedValue({ metadata: { servicePrice: 0 } });
    const result = await strategy.execute(makeCtx());
    expect(result).toEqual({});
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('execute calls $transaction when servicePrice > 0 and wallet exists', async () => {
    mockPrisma.workflowInstance.findUnique.mockResolvedValue({ metadata: { servicePrice: 500 } });
    mockPrisma.userWallet.findUnique.mockResolvedValue({ id: 'w1', balance: 1000 });
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
    await strategy.execute(makeCtx());
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});

// ─── VideoCallStrategy / AudioCallStrategy ───────────────────────────────────

describe('VideoCallStrategy', () => {
  let strategy: VideoCallStrategy;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = { videoRoom: { create: jest.fn().mockResolvedValue({}) } };
    strategy = new VideoCallStrategy(mockPrisma);
  });

  it('creates a video room and returns videoCallId', async () => {
    const result = await strategy.execute(makeCtx());
    expect(mockPrisma.videoRoom.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ mode: 'video' }) }),
    );
    expect(result.videoCallId).toBeDefined();
  });

  it('does not throw when room creation fails (warns instead)', async () => {
    mockPrisma.videoRoom.create.mockRejectedValue(new Error('DB error'));
    await expect(strategy.execute(makeCtx())).resolves.not.toThrow();
  });
});

describe('AudioCallStrategy', () => {
  let strategy: AudioCallStrategy;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = { videoRoom: { create: jest.fn().mockResolvedValue({}) } };
    strategy = new AudioCallStrategy(mockPrisma);
  });

  it('creates an audio room with mode=audio', async () => {
    await strategy.execute(makeCtx());
    expect(mockPrisma.videoRoom.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ mode: 'audio' }) }),
    );
  });
});

// ─── PrescriptionCheckStrategy ────────────────────────────────────────────────

describe('PrescriptionCheckStrategy', () => {
  let strategy: PrescriptionCheckStrategy;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      prescription: { findFirst: jest.fn() },
      providerInventoryItem: { findUnique: jest.fn() },
    };
    strategy = new PrescriptionCheckStrategy(mockPrisma);
  });

  it('validate returns valid=true when active prescription exists and no inventoryItems', async () => {
    mockPrisma.prescription.findFirst.mockResolvedValue({ id: 'RX001', isActive: true });
    const r = await strategy.validate(makeCtx());
    expect(r.valid).toBe(true);
  });

  it('validate returns valid=false when no prescription and no inventoryItems', async () => {
    mockPrisma.prescription.findFirst.mockResolvedValue(null);
    const r = await strategy.validate(makeCtx());
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/prescription/i);
  });

  it('validate returns valid=true when inventoryItems have no rx-required items', async () => {
    mockPrisma.providerInventoryItem.findUnique.mockResolvedValue({ name: 'Paracetamol', requiresPrescription: false });
    const ctx = makeCtx({ input: { inventoryItems: [{ itemId: 'ITEM001', quantity: 1 }] } });
    const r = await strategy.validate(ctx);
    expect(r.valid).toBe(true);
  });

  it('validate returns valid=false when inventory item requires Rx but none exists', async () => {
    mockPrisma.providerInventoryItem.findUnique.mockResolvedValue({ name: 'Codeine', requiresPrescription: true });
    mockPrisma.prescription.findFirst.mockResolvedValue(null);
    const ctx = makeCtx({ input: { inventoryItems: [{ itemId: 'ITEM002', quantity: 1 }] } });
    const r = await strategy.validate(ctx);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/Codeine/);
  });
});

// ─── ContentAttachmentStrategy ────────────────────────────────────────────────

describe('ContentAttachmentStrategy', () => {
  let strategy: ContentAttachmentStrategy;

  beforeEach(() => {
    strategy = new ContentAttachmentStrategy();
  });

  it('validate returns valid=true when no requires_content flag', async () => {
    const ctx = makeCtx({ flags: {} });
    const r = await strategy.validate(ctx);
    expect(r.valid).toBe(true);
  });

  it('validate returns valid=true when contentType + contentData match', async () => {
    const ctx = makeCtx({
      flags: { requires_content: 'lab_result' },
      input: { contentType: 'lab_result', contentData: { url: 'http://s3/file.pdf' } },
    });
    const r = await strategy.validate(ctx);
    expect(r.valid).toBe(true);
  });

  it('validate returns valid=false when contentType missing', async () => {
    const ctx = makeCtx({ flags: { requires_content: 'lab_result' } });
    const r = await strategy.validate(ctx);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/required/i);
  });

  it('validate returns valid=false when contentData is empty', async () => {
    const ctx = makeCtx({
      flags: { requires_content: 'care_notes' },
      input: { contentType: 'care_notes', contentData: {} },
    });
    const r = await strategy.validate(ctx);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/data/i);
  });

  it('validate returns valid=false when contentType mismatches required type', async () => {
    const ctx = makeCtx({
      flags: { requires_content: 'lab_result' },
      input: { contentType: 'care_notes', contentData: { text: 'notes' } },
    });
    const r = await strategy.validate(ctx);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/Expected/);
  });
});

// ─── StockCheckStrategy ───────────────────────────────────────────────────────

describe('StockCheckStrategy', () => {
  let strategy: StockCheckStrategy;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = { providerInventoryItem: { findFirst: jest.fn() } };
    strategy = new StockCheckStrategy(mockPrisma);
  });

  it('validate returns valid=true when inventoryItems is empty', async () => {
    const r = await strategy.validate(makeCtx());
    expect(r.valid).toBe(true);
  });

  it('validate returns valid=true when sufficient stock', async () => {
    mockPrisma.providerInventoryItem.findFirst.mockResolvedValue({
      name: 'Gauze', quantity: 10, inStock: true, isActive: true,
    });
    const ctx = makeCtx({ input: { inventoryItems: [{ itemId: 'ITEM001', quantity: 2 }] } });
    const r = await strategy.validate(ctx);
    expect(r.valid).toBe(true);
  });

  it('validate returns valid=false when insufficient stock', async () => {
    mockPrisma.providerInventoryItem.findFirst.mockResolvedValue({
      name: 'Gauze', quantity: 1, inStock: true, isActive: true,
    });
    const ctx = makeCtx({ input: { inventoryItems: [{ itemId: 'ITEM001', quantity: 5 }] } });
    const r = await strategy.validate(ctx);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/only 1 available/i);
  });

  it('validate returns valid=false when item not found', async () => {
    mockPrisma.providerInventoryItem.findFirst.mockResolvedValue(null);
    const ctx = makeCtx({ input: { inventoryItems: [{ itemId: 'GHOST', quantity: 1 }] } });
    const r = await strategy.validate(ctx);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/not found/i);
  });
});
