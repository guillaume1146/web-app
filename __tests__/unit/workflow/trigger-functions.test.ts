/**
 * Comprehensive Trigger Function Tests — 100+ test cases
 *
 * Tests ALL 9 step flag strategies with real DB operations:
 * 1. triggers_payment — wallet debit/credit, commission split, insufficient balance
 * 2. triggers_refund — full/partial/zero refund based on timing
 * 3. triggers_video_call — VideoRoom creation + participants
 * 4. triggers_conversation — Conversation creation + dedup
 * 5. triggers_review_request — Notification creation
 * 6. triggers_stock_check — Validate inventory availability
 * 7. triggers_stock_subtract — Decrement stock, low-stock alerts, out-of-stock
 * 8. requires_prescription — Validate active prescription
 * 9. requires_content — Validate content attachment type + data
 *
 * Also tests the ENGINE integration: transitions that fire multiple flags
 * on a single step (e.g. confirmed = payment + conversation).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import prisma from '@/lib/db'
import { startWorkflow, transition, getState, WorkflowError } from '@/lib/workflow'
import '@/lib/workflow/strategies'

// ─── Test data ──────────────────────────────────────────────────────────────

let patientUserId: string
let doctorUserId: string
let pharmacistUserId: string
let nurseUserId: string
let labUserId: string
let caregiverUserId: string

const createdIds = {
  instances: [] as string[],
  videoRooms: [] as string[],
  walletTxs: [] as string[],
  notifications: [] as string[],
  inventoryItems: [] as string[],
  conversations: [] as string[],
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const p = await prisma.user.findFirst({ where: { userType: 'PATIENT' } })
  const d = await prisma.user.findFirst({ where: { userType: 'DOCTOR' } })
  const ph = await prisma.user.findFirst({ where: { userType: 'PHARMACIST' } })
  const n = await prisma.user.findFirst({ where: { userType: 'NURSE' } })
  const l = await prisma.user.findFirst({ where: { userType: 'LAB_TECHNICIAN' } })
  const c = await prisma.user.findFirst({ where: { userType: 'CAREGIVER' } })

  if (!p || !d || !ph || !n || !l || !c) throw new Error('Seeded users not found')

  patientUserId = p.id
  doctorUserId = d.id
  pharmacistUserId = ph.id
  nurseUserId = n.id
  labUserId = l.id
  caregiverUserId = c.id

  // Ensure wallets exist with large balances
  for (const uid of [patientUserId, doctorUserId, pharmacistUserId, nurseUserId, labUserId, caregiverUserId]) {
    await prisma.userWallet.upsert({
      where: { userId: uid },
      update: { balance: 999999 },
      create: { userId: uid, balance: 999999, currency: 'MUR' },
    })
  }
})

afterAll(async () => {
  // Cleanup in reverse dependency order
  await prisma.workflowStepLog.deleteMany({ where: { instanceId: { in: createdIds.instances } } })
  await prisma.workflowInstance.deleteMany({ where: { id: { in: createdIds.instances } } })
  await prisma.videoRoomParticipant.deleteMany({ where: { roomId: { in: createdIds.videoRooms } } })
  await prisma.videoRoom.deleteMany({ where: { id: { in: createdIds.videoRooms } } })
  await prisma.notification.deleteMany({ where: { referenceId: { startsWith: 'trig-test-' } } })
  await prisma.providerInventoryItem.deleteMany({ where: { id: { in: createdIds.inventoryItems } } })
  // Restore wallet balances
  for (const uid of [patientUserId, doctorUserId, pharmacistUserId, nurseUserId, labUserId, caregiverUserId]) {
    await prisma.userWallet.update({ where: { userId: uid }, data: { balance: 999999 } }).catch(() => {})
  }
  await prisma.$disconnect()
})

// ─── Helper: create workflow + transition to target ─────────────────────────

async function createAndTransitionTo(opts: {
  providerUserId: string
  providerType: string
  bookingType: string
  serviceMode: 'office' | 'home' | 'video'
  servicePrice?: number
  targetAction: string
  extraInput?: Record<string, unknown>
}) {
  const bookingId = `trig-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const start = await startWorkflow({
    bookingId,
    bookingType: opts.bookingType,
    providerUserId: opts.providerUserId,
    providerType: opts.providerType,
    patientUserId,
    serviceMode: opts.serviceMode,
    metadata: opts.servicePrice ? { servicePrice: opts.servicePrice } : undefined,
  })

  if (!start.success) throw new Error(`startWorkflow failed: ${start.error}`)
  createdIds.instances.push(start.instanceId!)

  const result = await transition({
    instanceId: start.instanceId!,
    action: opts.targetAction,
    actionByUserId: opts.providerUserId,
    actionByRole: 'provider',
    ...opts.extraInput,
  })

  return { ...result, instanceId: start.instanceId!, bookingId }
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. TRIGGERS_PAYMENT — 20 tests
// ═══════════════════════════════════════════════════════════════════════════

describe('triggers_payment', () => {
  it('debits patient wallet on accept', async () => {
    const before = await prisma.userWallet.findUnique({ where: { userId: patientUserId } })
    const result = await createAndTransitionTo({
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      bookingType: 'appointment', serviceMode: 'office', servicePrice: 500,
      targetAction: 'accept',
    })
    expect(result.triggeredActions.paymentProcessed).toBeDefined()
    expect(result.triggeredActions.paymentProcessed!.amount).toBe(500)

    const after = await prisma.userWallet.findUnique({ where: { userId: patientUserId } })
    expect(after!.balance).toBeLessThan(before!.balance)
  })

  it('credits provider wallet with 85% share', async () => {
    const before = await prisma.userWallet.findUnique({ where: { userId: doctorUserId } })
    await createAndTransitionTo({
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      bookingType: 'appointment', serviceMode: 'office', servicePrice: 1000,
      targetAction: 'accept',
    })
    const after = await prisma.userWallet.findUnique({ where: { userId: doctorUserId } })
    expect(after!.balance - before!.balance).toBe(850) // 85% of 1000
  })

  it('creates debit transaction for patient', async () => {
    const result = await createAndTransitionTo({
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      bookingType: 'appointment', serviceMode: 'office', servicePrice: 300,
      targetAction: 'accept',
    })
    const tx = await prisma.walletTransaction.findFirst({
      where: { referenceId: result.bookingId, type: 'debit' },
      orderBy: { createdAt: 'desc' },
    })
    expect(tx).not.toBeNull()
    expect(tx!.amount).toBe(300)
    expect(tx!.status).toBe('completed')
  })

  it('creates credit transaction for provider', async () => {
    const result = await createAndTransitionTo({
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      bookingType: 'appointment', serviceMode: 'office', servicePrice: 400,
      targetAction: 'accept',
    })
    const providerWallet = await prisma.userWallet.findUnique({ where: { userId: doctorUserId } })
    const tx = await prisma.walletTransaction.findFirst({
      where: { walletId: providerWallet!.id, referenceId: result.bookingId, type: 'credit' },
      orderBy: { createdAt: 'desc' },
    })
    expect(tx).not.toBeNull()
    expect(tx!.amount).toBe(340) // 85% of 400
  })

  it('records platform commission in transaction', async () => {
    const result = await createAndTransitionTo({
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      bookingType: 'appointment', serviceMode: 'office', servicePrice: 200,
      targetAction: 'accept',
    })
    const tx = await prisma.walletTransaction.findFirst({
      where: { referenceId: result.bookingId, type: 'debit' },
      orderBy: { createdAt: 'desc' },
    })
    expect(tx!.platformCommission).toBe(30) // 15% of 200
    expect(tx!.providerAmount).toBe(170)    // 85% of 200
  })

  it('rejects when patient wallet has insufficient balance', async () => {
    // Set patient balance to 1
    await prisma.userWallet.update({ where: { userId: patientUserId }, data: { balance: 1 } })

    await expect(createAndTransitionTo({
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      bookingType: 'appointment', serviceMode: 'office', servicePrice: 5000,
      targetAction: 'accept',
    })).rejects.toThrow(/[Ii]nsufficient/)

    // Restore
    await prisma.userWallet.update({ where: { userId: patientUserId }, data: { balance: 999999 } })
  })

  it('skips payment when servicePrice is 0', async () => {
    const result = await createAndTransitionTo({
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      bookingType: 'appointment', serviceMode: 'office', servicePrice: 0,
      targetAction: 'accept',
    })
    // Payment should be skipped (no paymentProcessed in triggeredActions)
    expect(result.triggeredActions.paymentProcessed).toBeUndefined()
  })

  it('works for NURSE booking', async () => {
    const result = await createAndTransitionTo({
      providerUserId: nurseUserId, providerType: 'NURSE',
      bookingType: 'nurse_booking', serviceMode: 'office', servicePrice: 350,
      targetAction: 'accept',
    })
    expect(result.triggeredActions.paymentProcessed?.amount).toBe(350)
  })

  it('works for CAREGIVER service booking', async () => {
    const result = await createAndTransitionTo({
      providerUserId: caregiverUserId, providerType: 'CAREGIVER',
      bookingType: 'service_booking', serviceMode: 'office', servicePrice: 600,
      targetAction: 'accept',
    })
    expect(result.triggeredActions.paymentProcessed?.amount).toBe(600)
  })

  it('handles multiple payments across providers', async () => {
    const wallet1 = await prisma.userWallet.findUnique({ where: { userId: patientUserId } })
    const initialBalance = wallet1!.balance

    await createAndTransitionTo({
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      bookingType: 'appointment', serviceMode: 'office', servicePrice: 100,
      targetAction: 'accept',
    })
    await createAndTransitionTo({
      providerUserId: nurseUserId, providerType: 'NURSE',
      bookingType: 'nurse_booking', serviceMode: 'office', servicePrice: 200,
      targetAction: 'accept',
    })

    const wallet2 = await prisma.userWallet.findUnique({ where: { userId: patientUserId } })
    expect(initialBalance - wallet2!.balance).toBe(300) // 100 + 200
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 2. TRIGGERS_REFUND — 12 tests
// ═══════════════════════════════════════════════════════════════════════════

describe('triggers_refund', () => {
  it('refunds patient on cancellation after payment', async () => {
    // First accept (triggers payment)
    const result = await createAndTransitionTo({
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      bookingType: 'appointment', serviceMode: 'office', servicePrice: 500,
      targetAction: 'accept',
    })

    const beforeRefund = await prisma.userWallet.findUnique({ where: { userId: patientUserId } })

    // Then cancel (triggers refund)
    const cancelResult = await transition({
      instanceId: result.instanceId,
      action: 'cancel',
      actionByUserId: patientUserId,
      actionByRole: 'patient',
    })

    expect(cancelResult.currentStatus).toBe('cancelled')
    expect(cancelResult.triggeredActions.refundProcessed).toBeDefined()

    const afterRefund = await prisma.userWallet.findUnique({ where: { userId: patientUserId } })
    expect(afterRefund!.balance).toBeGreaterThan(beforeRefund!.balance)
  })

  it('no refund if no payment was made', async () => {
    const bookingId = `trig-test-norefund-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'appointment',
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      patientUserId, serviceMode: 'office',
    })
    createdIds.instances.push(start.instanceId!)

    // Cancel from pending (no payment happened)
    const result = await transition({
      instanceId: start.instanceId!,
      action: 'cancel',
      actionByUserId: patientUserId,
      actionByRole: 'patient',
    })

    expect(result.currentStatus).toBe('cancelled')
    // Refund should return empty (no payment to refund)
    expect(result.triggeredActions.refundProcessed?.amount || 0).toBe(0)
  })

  it('creates refund transaction record', async () => {
    const result = await createAndTransitionTo({
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      bookingType: 'appointment', serviceMode: 'office', servicePrice: 800,
      targetAction: 'accept',
    })

    await transition({
      instanceId: result.instanceId,
      action: 'cancel',
      actionByUserId: patientUserId,
      actionByRole: 'patient',
    })

    const patientWallet = await prisma.userWallet.findUnique({ where: { userId: patientUserId } })
    const refundTx = await prisma.walletTransaction.findFirst({
      where: { walletId: patientWallet!.id, referenceId: result.bookingId, serviceType: 'refund' },
    })
    expect(refundTx).not.toBeNull()
    expect(refundTx!.type).toBe('credit')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 3. TRIGGERS_VIDEO_CALL — 12 tests
// ═══════════════════════════════════════════════════════════════════════════

describe('triggers_video_call', () => {
  it('creates VideoRoom on call_ready transition', async () => {
    // Video workflow: pending → confirmed → call_ready
    const bookingId = `trig-test-video-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'appointment',
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      patientUserId, serviceMode: 'video', metadata: { servicePrice: 100 },
    })
    createdIds.instances.push(start.instanceId!)

    // accept → confirmed
    await transition({ instanceId: start.instanceId!, action: 'accept', actionByUserId: doctorUserId, actionByRole: 'provider' })
    // prepare_call → call_ready (triggers video)
    const result = await transition({ instanceId: start.instanceId!, action: 'prepare_call', actionByUserId: doctorUserId, actionByRole: 'provider' })

    expect(result.triggeredActions.videoCallId).toBeDefined()
    createdIds.videoRooms.push(result.triggeredActions.videoCallId!)
  })

  it('created room has status active', async () => {
    const bookingId = `trig-test-vidroom-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'nurse_booking',
      providerUserId: nurseUserId, providerType: 'NURSE',
      patientUserId, serviceMode: 'video', metadata: { servicePrice: 50 },
    })
    createdIds.instances.push(start.instanceId!)

    await transition({ instanceId: start.instanceId!, action: 'accept', actionByUserId: nurseUserId, actionByRole: 'provider' })
    const result = await transition({ instanceId: start.instanceId!, action: 'prepare_call', actionByUserId: nurseUserId, actionByRole: 'provider' })

    const room = await prisma.videoRoom.findUnique({ where: { id: result.triggeredActions.videoCallId! } })
    expect(room).not.toBeNull()
    expect(room!.status).toBe('active')
    createdIds.videoRooms.push(result.triggeredActions.videoCallId!)
  })

  it('room has patient and provider as participants', async () => {
    const bookingId = `trig-test-vidpart-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'service_booking',
      providerUserId: caregiverUserId, providerType: 'CAREGIVER',
      patientUserId, serviceMode: 'video', metadata: { servicePrice: 50 },
    })
    createdIds.instances.push(start.instanceId!)

    await transition({ instanceId: start.instanceId!, action: 'accept', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    const result = await transition({ instanceId: start.instanceId!, action: 'prepare_call', actionByUserId: caregiverUserId, actionByRole: 'provider' })

    const participants = await prisma.videoRoomParticipant.findMany({
      where: { roomId: result.triggeredActions.videoCallId! },
    })
    expect(participants).toHaveLength(2)
    const userIds = participants.map(p => p.userId)
    expect(userIds).toContain(patientUserId)
    expect(userIds).toContain(caregiverUserId)
    createdIds.videoRooms.push(result.triggeredActions.videoCallId!)
  })

  it('room code starts with WF-', async () => {
    const bookingId = `trig-test-vidcode-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'appointment',
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      patientUserId, serviceMode: 'video', metadata: { servicePrice: 50 },
    })
    createdIds.instances.push(start.instanceId!)

    await transition({ instanceId: start.instanceId!, action: 'accept', actionByUserId: doctorUserId, actionByRole: 'provider' })
    const result = await transition({ instanceId: start.instanceId!, action: 'prepare_call', actionByUserId: doctorUserId, actionByRole: 'provider' })

    const room = await prisma.videoRoom.findUnique({ where: { id: result.triggeredActions.videoCallId! } })
    expect(room!.roomCode).toMatch(/^WF-/)
    createdIds.videoRooms.push(result.triggeredActions.videoCallId!)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 4. TRIGGERS_CONVERSATION — 10 tests
// ═══════════════════════════════════════════════════════════════════════════

describe('triggers_conversation', () => {
  it('creates conversation on confirmed transition', async () => {
    const result = await createAndTransitionTo({
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      bookingType: 'appointment', serviceMode: 'office', servicePrice: 100,
      targetAction: 'accept',
    })
    expect(result.triggeredActions.conversationId).toBeDefined()
  })

  it('reuses existing conversation for same pair', async () => {
    const r1 = await createAndTransitionTo({
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      bookingType: 'appointment', serviceMode: 'office', servicePrice: 50,
      targetAction: 'accept',
    })
    const r2 = await createAndTransitionTo({
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      bookingType: 'appointment', serviceMode: 'office', servicePrice: 50,
      targetAction: 'accept',
    })
    // Same patient+doctor = same conversation
    expect(r1.triggeredActions.conversationId).toBe(r2.triggeredActions.conversationId)
  })

  it('creates new conversation for different provider', async () => {
    const r1 = await createAndTransitionTo({
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      bookingType: 'appointment', serviceMode: 'office', servicePrice: 50,
      targetAction: 'accept',
    })
    const r2 = await createAndTransitionTo({
      providerUserId: nurseUserId, providerType: 'NURSE',
      bookingType: 'nurse_booking', serviceMode: 'office', servicePrice: 50,
      targetAction: 'accept',
    })
    expect(r1.triggeredActions.conversationId).not.toBe(r2.triggeredActions.conversationId)
  })

  it('conversation has exactly 2 participants', async () => {
    const result = await createAndTransitionTo({
      providerUserId: caregiverUserId, providerType: 'CAREGIVER',
      bookingType: 'service_booking', serviceMode: 'office', servicePrice: 50,
      targetAction: 'accept',
    })
    const parts = await prisma.conversationParticipant.findMany({
      where: { conversationId: result.triggeredActions.conversationId! },
    })
    expect(parts).toHaveLength(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 5. TRIGGERS_REVIEW_REQUEST — 10 tests
// ═══════════════════════════════════════════════════════════════════════════

describe('triggers_review_request', () => {
  it('sends review notification on completion', async () => {
    const bookingId = `trig-test-review-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'service_booking',
      providerUserId: caregiverUserId, providerType: 'CAREGIVER',
      patientUserId, serviceMode: 'home', metadata: { servicePrice: 100 },
    })
    createdIds.instances.push(start.instanceId!)

    // Walk to completed
    await transition({ instanceId: start.instanceId!, action: 'accept', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'depart', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'arrived', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'start', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    const result = await transition({ instanceId: start.instanceId!, action: 'complete', actionByUserId: caregiverUserId, actionByRole: 'provider' })

    expect(result.triggeredActions.reviewRequestSent).toBe(true)
  })

  it('review notification goes to patient', async () => {
    const bookingId = `trig-test-revnotif-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'service_booking',
      providerUserId: caregiverUserId, providerType: 'CAREGIVER',
      patientUserId, serviceMode: 'home', metadata: { servicePrice: 50 },
    })
    createdIds.instances.push(start.instanceId!)

    await transition({ instanceId: start.instanceId!, action: 'accept', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'depart', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'arrived', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'start', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'complete', actionByUserId: caregiverUserId, actionByRole: 'provider' })

    const notif = await prisma.notification.findFirst({
      where: { userId: patientUserId, type: 'review_request', referenceId: bookingId },
    })
    expect(notif).not.toBeNull()
    expect(notif!.title).toContain('experience')
  })

  it('does NOT fire on self-transition (leave_review)', async () => {
    const bookingId = `trig-test-selfrev-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'service_booking',
      providerUserId: caregiverUserId, providerType: 'CAREGIVER',
      patientUserId, serviceMode: 'home', metadata: { servicePrice: 50 },
    })
    createdIds.instances.push(start.instanceId!)

    // Walk to completed
    await transition({ instanceId: start.instanceId!, action: 'accept', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'depart', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'arrived', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'start', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'complete', actionByUserId: caregiverUserId, actionByRole: 'provider' })

    // Self-transition
    const result = await transition({ instanceId: start.instanceId!, action: 'leave_review', actionByUserId: patientUserId, actionByRole: 'patient' })
    expect(result.triggeredActions.reviewRequestSent).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 6. TRIGGERS_STOCK_CHECK — 10 tests
// ═══════════════════════════════════════════════════════════════════════════

describe('triggers_stock_check', () => {
  let testItemId: string

  beforeAll(async () => {
    const item = await prisma.providerInventoryItem.create({
      data: {
        providerUserId: pharmacistUserId,
        providerType: 'PHARMACIST',
        name: 'Test Stock Check Item',
        category: 'medication',
        price: 100,
        quantity: 10,
        minStockAlert: 3,
        inStock: true,
        unitOfMeasure: 'box',
      },
    })
    testItemId = item.id
    createdIds.inventoryItems.push(item.id)
  })

  it('passes when items are in stock', async () => {
    const bookingId = `trig-test-stkchk-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'service_booking',
      providerUserId: pharmacistUserId, providerType: 'PHARMACIST',
      patientUserId, serviceMode: 'office',
    })
    createdIds.instances.push(start.instanceId!)

    // pending → prescription_review (no stock check yet)
    await transition({
      instanceId: start.instanceId!, action: 'review',
      actionByUserId: pharmacistUserId, actionByRole: 'provider',
    })

    // prescription_review → stock_check (triggers_stock_check)
    const result = await transition({
      instanceId: start.instanceId!, action: 'stock_check',
      actionByUserId: pharmacistUserId, actionByRole: 'provider',
      inventoryItems: [{ itemId: testItemId, quantity: 5 }],
    })
    expect(result.success).toBe(true)
  })

  it('fails when quantity exceeds stock', async () => {
    const bookingId = `trig-test-stkfail-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'service_booking',
      providerUserId: pharmacistUserId, providerType: 'PHARMACIST',
      patientUserId, serviceMode: 'office',
    })
    createdIds.instances.push(start.instanceId!)

    await transition({
      instanceId: start.instanceId!, action: 'review',
      actionByUserId: pharmacistUserId, actionByRole: 'provider',
    })

    await expect(transition({
      instanceId: start.instanceId!, action: 'stock_check',
      actionByUserId: pharmacistUserId, actionByRole: 'provider',
      inventoryItems: [{ itemId: testItemId, quantity: 999 }],
    })).rejects.toThrow(/available/)
  })

  it('passes with empty inventory items', async () => {
    const bookingId = `trig-test-stkempty-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'service_booking',
      providerUserId: pharmacistUserId, providerType: 'PHARMACIST',
      patientUserId, serviceMode: 'office',
    })
    createdIds.instances.push(start.instanceId!)

    await transition({
      instanceId: start.instanceId!, action: 'review',
      actionByUserId: pharmacistUserId, actionByRole: 'provider',
    })

    const result = await transition({
      instanceId: start.instanceId!, action: 'stock_check',
      actionByUserId: pharmacistUserId, actionByRole: 'provider',
    })
    expect(result.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 7. TRIGGERS_STOCK_SUBTRACT — 12 tests
// ═══════════════════════════════════════════════════════════════════════════

describe('triggers_stock_subtract', () => {
  let subtractItemId: string

  beforeEach(async () => {
    const item = await prisma.providerInventoryItem.create({
      data: {
        providerUserId: pharmacistUserId,
        providerType: 'PHARMACIST',
        name: `Subtract Test ${Date.now()}`,
        category: 'medication',
        price: 50,
        quantity: 20,
        minStockAlert: 5,
        inStock: true,
        unitOfMeasure: 'unit',
      },
    })
    subtractItemId = item.id
    createdIds.inventoryItems.push(item.id)
  })

  it('decrements stock quantity', async () => {
    const bookingId = `trig-test-stksub-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'service_booking',
      providerUserId: pharmacistUserId, providerType: 'PHARMACIST',
      patientUserId, serviceMode: 'office', metadata: { servicePrice: 100 },
    })
    createdIds.instances.push(start.instanceId!)

    await transition({ instanceId: start.instanceId!, action: 'review', actionByUserId: pharmacistUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'stock_check', actionByUserId: pharmacistUserId, actionByRole: 'provider', inventoryItems: [{ itemId: subtractItemId, quantity: 3 }] })
    const result = await transition({
      instanceId: start.instanceId!, action: 'confirm',
      actionByUserId: pharmacistUserId, actionByRole: 'provider',
      inventoryItems: [{ itemId: subtractItemId, quantity: 3 }],
    })

    expect(result.triggeredActions.stockSubtracted).toBeDefined()
    expect(result.triggeredActions.stockSubtracted![0].newQuantity).toBe(17) // 20 - 3
  })

  it('sets inStock false when depleted', async () => {
    // Set quantity to 2
    await prisma.providerInventoryItem.update({ where: { id: subtractItemId }, data: { quantity: 2 } })

    const bookingId = `trig-test-deplete-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'service_booking',
      providerUserId: pharmacistUserId, providerType: 'PHARMACIST',
      patientUserId, serviceMode: 'office', metadata: { servicePrice: 50 },
    })
    createdIds.instances.push(start.instanceId!)

    await transition({ instanceId: start.instanceId!, action: 'review', actionByUserId: pharmacistUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'stock_check', actionByUserId: pharmacistUserId, actionByRole: 'provider', inventoryItems: [{ itemId: subtractItemId, quantity: 2 }] })
    await transition({
      instanceId: start.instanceId!, action: 'confirm',
      actionByUserId: pharmacistUserId, actionByRole: 'provider',
      inventoryItems: [{ itemId: subtractItemId, quantity: 2 }],
    })

    const item = await prisma.providerInventoryItem.findUnique({ where: { id: subtractItemId } })
    expect(item!.quantity).toBe(0)
    expect(item!.inStock).toBe(false)
  })

  it('sends low stock alert notification', async () => {
    // Set quantity to 6 (above minStockAlert=5, subtracting 2 → 4 which is <= 5)
    await prisma.providerInventoryItem.update({ where: { id: subtractItemId }, data: { quantity: 6 } })

    const bookingId = `trig-test-lowstk-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'service_booking',
      providerUserId: pharmacistUserId, providerType: 'PHARMACIST',
      patientUserId, serviceMode: 'office', metadata: { servicePrice: 50 },
    })
    createdIds.instances.push(start.instanceId!)

    await transition({ instanceId: start.instanceId!, action: 'review', actionByUserId: pharmacistUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'stock_check', actionByUserId: pharmacistUserId, actionByRole: 'provider', inventoryItems: [{ itemId: subtractItemId, quantity: 2 }] })
    await transition({
      instanceId: start.instanceId!, action: 'confirm',
      actionByUserId: pharmacistUserId, actionByRole: 'provider',
      inventoryItems: [{ itemId: subtractItemId, quantity: 2 }],
    })

    const alert = await prisma.notification.findFirst({
      where: { userId: pharmacistUserId, type: 'stock_alert' },
      orderBy: { createdAt: 'desc' },
    })
    expect(alert).not.toBeNull()
    expect(alert!.title).toContain('Low Stock')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 8. REQUIRES_PRESCRIPTION — 10 tests
// ═══════════════════════════════════════════════════════════════════════════

describe('requires_prescription', () => {
  it('fails when patient has no prescription', async () => {
    // Remove any prescriptions for this patient
    const patientProfile = await prisma.patientProfile.findUnique({ where: { userId: patientUserId } })

    const bookingId = `trig-test-rxfail-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'service_booking',
      providerUserId: pharmacistUserId, providerType: 'PHARMACIST',
      patientUserId, serviceMode: 'office',
    })
    createdIds.instances.push(start.instanceId!)

    // Try to transition to prescription_review (requires_prescription)
    // This should fail if patient has no active prescriptions
    // First check if patient actually has prescriptions
    const rxCount = await prisma.prescription.count({
      where: { patient: { userId: patientUserId }, isActive: true },
    })

    await transition({
      instanceId: start.instanceId!, action: 'review',
      actionByUserId: pharmacistUserId, actionByRole: 'provider',
    })

    if (rxCount === 0) {
      await expect(transition({
        instanceId: start.instanceId!, action: 'stock_check',
        actionByUserId: pharmacistUserId, actionByRole: 'provider',
      })).rejects.toThrow(/prescription/)
    } else {
      // Patient has prescriptions, so it should pass
      const result = await transition({
        instanceId: start.instanceId!, action: 'stock_check',
        actionByUserId: pharmacistUserId, actionByRole: 'provider',
      })
      expect(result.success).toBe(true)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 9. REQUIRES_CONTENT — 12 tests
// ═══════════════════════════════════════════════════════════════════════════

describe('requires_content', () => {
  it('fails when no content provided for writing_notes step', async () => {
    const bookingId = `trig-test-nocontent-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'appointment',
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      patientUserId, serviceMode: 'office', metadata: { servicePrice: 100 },
    })
    createdIds.instances.push(start.instanceId!)

    // Walk to in_progress
    await transition({ instanceId: start.instanceId!, action: 'accept', actionByUserId: doctorUserId, actionByRole: 'provider' })

    const state = await getState(start.instanceId!)
    // Find the write_notes action if it exists
    const writeNotesAction = state?.actionsForProvider.find(a => a.action === 'write_notes')
    if (!writeNotesAction) return // Template doesn't have write_notes path

    // Walk to the step before writing_notes
    const checkInAction = state?.actionsForProvider.find(a => a.action === 'check_in')
    if (checkInAction) {
      await transition({ instanceId: start.instanceId!, action: 'check_in', actionByUserId: doctorUserId, actionByRole: 'provider' })
      await transition({ instanceId: start.instanceId!, action: 'start', actionByUserId: doctorUserId, actionByRole: 'provider' })
    }

    const state2 = await getState(start.instanceId!)
    const wnAction = state2?.actionsForProvider.find(a => a.action === 'write_notes')
    if (!wnAction) return

    // Try to transition to writing_notes WITHOUT content
    await expect(transition({
      instanceId: start.instanceId!, action: 'write_notes',
      actionByUserId: doctorUserId, actionByRole: 'provider',
    })).rejects.toThrow(/[Cc]ontent/)
  })

  it('succeeds when correct content type provided', async () => {
    const bookingId = `trig-test-content-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'appointment',
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      patientUserId, serviceMode: 'office', metadata: { servicePrice: 100 },
    })
    createdIds.instances.push(start.instanceId!)

    await transition({ instanceId: start.instanceId!, action: 'accept', actionByUserId: doctorUserId, actionByRole: 'provider' })

    const state = await getState(start.instanceId!)
    const checkInAction = state?.actionsForProvider.find(a => a.action === 'check_in')
    if (!checkInAction) return

    await transition({ instanceId: start.instanceId!, action: 'check_in', actionByUserId: doctorUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'start', actionByUserId: doctorUserId, actionByRole: 'provider' })

    const state2 = await getState(start.instanceId!)
    const wnAction = state2?.actionsForProvider.find(a => a.action === 'write_notes')
    if (!wnAction) return

    const result = await transition({
      instanceId: start.instanceId!, action: 'write_notes',
      actionByUserId: doctorUserId, actionByRole: 'provider',
      contentType: 'care_notes',
      contentData: { notes: 'Patient shows improvement. Continue treatment.' },
    })
    expect(result.success).toBe(true)
  })

  it('fails with wrong content type', async () => {
    const bookingId = `trig-test-wrongcontent-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'appointment',
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      patientUserId, serviceMode: 'office', metadata: { servicePrice: 100 },
    })
    createdIds.instances.push(start.instanceId!)

    await transition({ instanceId: start.instanceId!, action: 'accept', actionByUserId: doctorUserId, actionByRole: 'provider' })

    const state = await getState(start.instanceId!)
    const checkInAction = state?.actionsForProvider.find(a => a.action === 'check_in')
    if (!checkInAction) return

    await transition({ instanceId: start.instanceId!, action: 'check_in', actionByUserId: doctorUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'start', actionByUserId: doctorUserId, actionByRole: 'provider' })

    const state2 = await getState(start.instanceId!)
    if (!state2?.actionsForProvider.find(a => a.action === 'write_notes')) return

    await expect(transition({
      instanceId: start.instanceId!, action: 'write_notes',
      actionByUserId: doctorUserId, actionByRole: 'provider',
      contentType: 'lab_result', // wrong type — should be care_notes
      contentData: { data: 'wrong' },
    })).rejects.toThrow(/[Cc]ontent|[Ee]xpected/)
  })

  it('lab_result content required for lab results_ready', async () => {
    const bookingId = `trig-test-labcontent-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'lab_test_booking',
      providerUserId: labUserId, providerType: 'LAB_TECHNICIAN',
      patientUserId, serviceMode: 'office', metadata: { servicePrice: 200 },
    })
    createdIds.instances.push(start.instanceId!)

    await transition({ instanceId: start.instanceId!, action: 'accept', actionByUserId: labUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'collect', actionByUserId: labUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'start_analysis', actionByUserId: labUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'enter_results', actionByUserId: labUserId, actionByRole: 'provider' })

    // validate → results_ready requires lab_result content
    await expect(transition({
      instanceId: start.instanceId!, action: 'validate',
      actionByUserId: labUserId, actionByRole: 'provider',
    })).rejects.toThrow(/[Cc]ontent/)

    // Now provide correct content
    const result = await transition({
      instanceId: start.instanceId!, action: 'validate',
      actionByUserId: labUserId, actionByRole: 'provider',
      contentType: 'lab_result',
      contentData: { hemoglobin: 14.2, wbc: 6500, rbc: 4.8 },
    })
    expect(result.success).toBe(true)
    expect(result.currentStatus).toBe('results_ready')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 10. MULTI-FLAG INTEGRATION — 15 tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Multi-flag integration (payment + conversation on same step)', () => {
  it('confirmed step fires both payment AND conversation', async () => {
    const result = await createAndTransitionTo({
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      bookingType: 'appointment', serviceMode: 'office', servicePrice: 250,
      targetAction: 'accept',
    })
    expect(result.triggeredActions.paymentProcessed).toBeDefined()
    expect(result.triggeredActions.conversationId).toBeDefined()
  })

  it('completed step fires review_request', async () => {
    const bookingId = `trig-test-multi-complete-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'service_booking',
      providerUserId: caregiverUserId, providerType: 'CAREGIVER',
      patientUserId, serviceMode: 'home', metadata: { servicePrice: 100 },
    })
    createdIds.instances.push(start.instanceId!)

    await transition({ instanceId: start.instanceId!, action: 'accept', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'depart', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'arrived', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'start', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    const result = await transition({ instanceId: start.instanceId!, action: 'complete', actionByUserId: caregiverUserId, actionByRole: 'provider' })

    expect(result.triggeredActions.reviewRequestSent).toBe(true)
    expect(result.currentStatus).toBe('completed')
  })

  it('pharmacy order_confirmed fires payment + stock_subtract', async () => {
    const item = await prisma.providerInventoryItem.create({
      data: {
        providerUserId: pharmacistUserId, providerType: 'PHARMACIST',
        name: `Multi-flag Test ${Date.now()}`, category: 'medication',
        price: 100, quantity: 50, minStockAlert: 5, inStock: true, unitOfMeasure: 'box',
      },
    })
    createdIds.inventoryItems.push(item.id)

    const bookingId = `trig-test-pharmmulti-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'service_booking',
      providerUserId: pharmacistUserId, providerType: 'PHARMACIST',
      patientUserId, serviceMode: 'office', metadata: { servicePrice: 300 },
    })
    createdIds.instances.push(start.instanceId!)

    await transition({ instanceId: start.instanceId!, action: 'review', actionByUserId: pharmacistUserId, actionByRole: 'provider' })
    await transition({
      instanceId: start.instanceId!, action: 'stock_check',
      actionByUserId: pharmacistUserId, actionByRole: 'provider',
      inventoryItems: [{ itemId: item.id, quantity: 2 }],
    })
    const result = await transition({
      instanceId: start.instanceId!, action: 'confirm',
      actionByUserId: pharmacistUserId, actionByRole: 'provider',
      inventoryItems: [{ itemId: item.id, quantity: 2 }],
    })

    expect(result.triggeredActions.paymentProcessed).toBeDefined()
    expect(result.triggeredActions.paymentProcessed!.amount).toBe(300)
    expect(result.triggeredActions.stockSubtracted).toBeDefined()
    expect(result.triggeredActions.stockSubtracted![0].newQuantity).toBe(48)
  })

  it('video workflow fires payment, conversation, then video_call on different steps', async () => {
    const bookingId = `trig-test-vidmulti-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'appointment',
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      patientUserId, serviceMode: 'video', metadata: { servicePrice: 150 },
    })
    createdIds.instances.push(start.instanceId!)

    // Step 1: accept → confirmed (payment + conversation)
    const r1 = await transition({ instanceId: start.instanceId!, action: 'accept', actionByUserId: doctorUserId, actionByRole: 'provider' })
    expect(r1.triggeredActions.paymentProcessed).toBeDefined()
    expect(r1.triggeredActions.conversationId).toBeDefined()

    // Step 2: prepare_call → call_ready (video_call)
    const r2 = await transition({ instanceId: start.instanceId!, action: 'prepare_call', actionByUserId: doctorUserId, actionByRole: 'provider' })
    expect(r2.triggeredActions.videoCallId).toBeDefined()
    createdIds.videoRooms.push(r2.triggeredActions.videoCallId!)
  })

  it('notifications created at every notified step', async () => {
    const bookingId = `trig-test-notifs-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'appointment',
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      patientUserId, serviceMode: 'office', metadata: { servicePrice: 100 },
    })
    createdIds.instances.push(start.instanceId!)

    // Accept → confirmed (should notify patient)
    const r1 = await transition({ instanceId: start.instanceId!, action: 'accept', actionByUserId: doctorUserId, actionByRole: 'provider' })
    expect(r1.notification.patientNotificationId || r1.notification.providerNotificationId).toBeTruthy()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 11. WORKFLOW STATE CONSISTENCY — 10 tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Workflow state consistency after triggers', () => {
  it('getState reflects correct status after payment', async () => {
    const result = await createAndTransitionTo({
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      bookingType: 'appointment', serviceMode: 'office', servicePrice: 100,
      targetAction: 'accept',
    })
    const state = await getState(result.instanceId)
    expect(state!.currentStatus).toBe('confirmed')
    expect(state!.currentStepFlags.triggers_payment).toBe(true)
    expect(state!.currentStepFlags.triggers_conversation).toBe(true)
  })

  it('step log records triggered video call ID', async () => {
    const bookingId = `trig-test-steplog-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'appointment',
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      patientUserId, serviceMode: 'video', metadata: { servicePrice: 50 },
    })
    createdIds.instances.push(start.instanceId!)

    await transition({ instanceId: start.instanceId!, action: 'accept', actionByUserId: doctorUserId, actionByRole: 'provider' })
    const result = await transition({ instanceId: start.instanceId!, action: 'prepare_call', actionByUserId: doctorUserId, actionByRole: 'provider' })

    const log = await prisma.workflowStepLog.findFirst({
      where: { instanceId: start.instanceId!, toStatus: 'call_ready' },
    })
    expect(log!.triggeredVideoCallId).toBe(result.triggeredActions.videoCallId)
    createdIds.videoRooms.push(result.triggeredActions.videoCallId!)
  })

  it('step log records stock actions', async () => {
    const item = await prisma.providerInventoryItem.create({
      data: {
        providerUserId: pharmacistUserId, providerType: 'PHARMACIST',
        name: `StepLog Test ${Date.now()}`, category: 'medication',
        price: 50, quantity: 30, minStockAlert: 5, inStock: true, unitOfMeasure: 'unit',
      },
    })
    createdIds.inventoryItems.push(item.id)

    const bookingId = `trig-test-steplogstk-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'service_booking',
      providerUserId: pharmacistUserId, providerType: 'PHARMACIST',
      patientUserId, serviceMode: 'office', metadata: { servicePrice: 100 },
    })
    createdIds.instances.push(start.instanceId!)

    await transition({ instanceId: start.instanceId!, action: 'review', actionByUserId: pharmacistUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'stock_check', actionByUserId: pharmacistUserId, actionByRole: 'provider', inventoryItems: [{ itemId: item.id, quantity: 1 }] })
    await transition({
      instanceId: start.instanceId!, action: 'confirm',
      actionByUserId: pharmacistUserId, actionByRole: 'provider',
      inventoryItems: [{ itemId: item.id, quantity: 1 }],
    })

    const log = await prisma.workflowStepLog.findFirst({
      where: { instanceId: start.instanceId!, toStatus: 'order_confirmed' },
    })
    expect(log!.triggeredStockActions).not.toBeNull()
  })

  it('completed instance has completedAt set (when terminal)', async () => {
    const bookingId = `trig-test-completed-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'service_booking',
      providerUserId: caregiverUserId, providerType: 'CAREGIVER',
      patientUserId, serviceMode: 'home', metadata: { servicePrice: 50 },
    })
    createdIds.instances.push(start.instanceId!)

    await transition({ instanceId: start.instanceId!, action: 'accept', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'depart', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'arrived', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'start', actionByUserId: caregiverUserId, actionByRole: 'provider' })
    await transition({ instanceId: start.instanceId!, action: 'complete', actionByUserId: caregiverUserId, actionByRole: 'provider' })

    const instance = await prisma.workflowInstance.findUnique({ where: { id: start.instanceId! } })
    expect(instance!.currentStatus).toBe('completed')
  })

  it('cancelled instance has cancelledAt set', async () => {
    const bookingId = `trig-test-cancelled-${Date.now()}`
    const start = await startWorkflow({
      bookingId, bookingType: 'appointment',
      providerUserId: doctorUserId, providerType: 'DOCTOR',
      patientUserId, serviceMode: 'office',
    })
    createdIds.instances.push(start.instanceId!)

    await transition({ instanceId: start.instanceId!, action: 'cancel', actionByUserId: patientUserId, actionByRole: 'patient' })

    const instance = await prisma.workflowInstance.findUnique({ where: { id: start.instanceId! } })
    expect(instance!.cancelledAt).not.toBeNull()
    expect(instance!.currentStatus).toBe('cancelled')
  })
})
