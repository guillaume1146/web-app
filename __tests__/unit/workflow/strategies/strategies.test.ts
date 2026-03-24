/**
 * Phase 3+4 Tests — Inventory + Step Flag Strategies
 */
import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { StockCheckStrategy } from '@/lib/workflow/strategies/stock-check.strategy'
import { StockSubtractStrategy } from '@/lib/workflow/strategies/stock-subtract.strategy'
import { ContentAttachmentStrategy } from '@/lib/workflow/strategies/content-attachment.strategy'
import { VideoCallStrategy } from '@/lib/workflow/strategies/video-call.strategy'
import * as inventoryRepo from '@/lib/inventory/repository'
import type { TransitionContext } from '@/lib/workflow'

const prisma = new PrismaClient()

let providerUserId: string
let patientUserId: string
const createdItemIds: string[] = []
const createdOrderIds: string[] = []
const createdVideoRoomIds: string[] = []

beforeAll(async () => {
  const patient = await prisma.user.findFirst({ where: { userType: 'PATIENT' }, select: { id: true } })
  const doctor = await prisma.user.findFirst({ where: { userType: 'DOCTOR' }, select: { id: true } })
  if (!patient || !doctor) throw new Error('Seeded users required')
  patientUserId = patient.id
  providerUserId = doctor.id
})

afterAll(async () => {
  await prisma.inventoryOrderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } })
  await prisma.inventoryOrder.deleteMany({ where: { id: { in: createdOrderIds } } })
  await prisma.providerInventoryItem.deleteMany({ where: { id: { in: createdItemIds } } })
  await prisma.notification.deleteMany({ where: { type: { in: ['stock_alert', 'shop_order'] } } })
  for (const id of createdVideoRoomIds) {
    await prisma.videoRoomParticipant.deleteMany({ where: { roomId: id } })
    await prisma.videoRoom.deleteMany({ where: { id } })
  }
  await prisma.$disconnect()
})

function makeContext(overrides: Partial<TransitionContext> = {}): TransitionContext {
  return {
    instanceId: 'test-instance',
    templateId: 'test-template',
    bookingId: 'test-booking',
    bookingType: 'appointment',
    patientUserId,
    providerUserId,
    fromStatus: 'pending',
    toStatus: 'confirmed',
    action: 'accept',
    flags: {},
    input: {
      action: 'accept',
      actionByUserId: providerUserId,
      actionByRole: 'provider',
    },
    ...overrides,
  }
}

// ─── Inventory Repository ───────────────────────────────────────────────────

describe('Inventory Repository', () => {
  const repo = inventoryRepo

  it('creates items for any provider type', async () => {
    const item = await repo.createItem(providerUserId, 'DOCTOR', {
      name: 'Blood Pressure Monitor',
      category: 'medical_devices',
      price: 2500,
      quantity: 10,
    })
    createdItemIds.push(item.id)
    expect(item.providerType).toBe('DOCTOR')
    expect(item.category).toBe('medical_devices')
    expect(item.inStock).toBe(true)
  })

  it('searches items with filters', async () => {
    const result = await repo.searchItems({ category: 'medical_devices' })
    expect(result.items.length).toBeGreaterThanOrEqual(1)
    expect(result.total).toBeGreaterThanOrEqual(1)
  })

  it('decrements stock and flags out-of-stock', async () => {
    const item = await repo.createItem(providerUserId, 'DOCTOR', {
      name: 'Limited Item',
      category: 'other',
      price: 100,
      quantity: 2,
    })
    createdItemIds.push(item.id)

    const after = await repo.decrementStock(item.id, 2)
    expect(after.quantity).toBe(0)
    expect(after.inStock).toBe(false)
  })
})

// ─── StockCheckStrategy ─────────────────────────────────────────────────────

describe('StockCheckStrategy', () => {
  const strategy = new StockCheckStrategy()

  it('passes when items are in stock', async () => {
    const item = await prisma.providerInventoryItem.create({
      data: {
        providerUserId,
        providerType: 'DOCTOR',
        name: 'StockCheck Test Item',
        category: 'other',
        price: 50,
        quantity: 100,
        inStock: true,
      },
    })
    createdItemIds.push(item.id)

    const ctx = makeContext({
      flags: { triggers_stock_check: true },
      input: {
        action: 'accept',
        actionByUserId: providerUserId,
        actionByRole: 'provider',
        inventoryItems: [{ itemId: item.id, quantity: 5 }],
      },
    })

    const result = await strategy.validate!(ctx)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails when items are out of stock', async () => {
    const item = await prisma.providerInventoryItem.create({
      data: {
        providerUserId,
        providerType: 'DOCTOR',
        name: 'OOS Test Item',
        category: 'other',
        price: 50,
        quantity: 0,
        inStock: false,
      },
    })
    createdItemIds.push(item.id)

    const ctx = makeContext({
      flags: { triggers_stock_check: true },
      input: {
        action: 'accept',
        actionByUserId: providerUserId,
        actionByRole: 'provider',
        inventoryItems: [{ itemId: item.id, quantity: 1 }],
      },
    })

    const result = await strategy.validate!(ctx)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('passes with no inventory items', async () => {
    const ctx = makeContext({
      flags: { triggers_stock_check: true },
      input: { action: 'accept', actionByUserId: providerUserId, actionByRole: 'provider' },
    })

    const result = await strategy.validate!(ctx)
    expect(result.valid).toBe(true)
  })
})

// ─── StockSubtractStrategy ──────────────────────────────────────────────────

describe('StockSubtractStrategy', () => {
  const strategy = new StockSubtractStrategy()

  it('decrements stock and returns new quantities', async () => {
    const item = await prisma.providerInventoryItem.create({
      data: {
        providerUserId,
        providerType: 'DOCTOR',
        name: 'Subtract Test Item',
        category: 'other',
        price: 50,
        quantity: 20,
        minStockAlert: 5,
        inStock: true,
      },
    })
    createdItemIds.push(item.id)

    const ctx = makeContext({
      flags: { triggers_stock_subtract: true },
      input: {
        action: 'accept',
        actionByUserId: providerUserId,
        actionByRole: 'provider',
        inventoryItems: [{ itemId: item.id, quantity: 3 }],
      },
    })

    const result = await strategy.execute!(ctx)
    expect(result.stockSubtracted).toBeDefined()
    expect(result.stockSubtracted).toHaveLength(1)
    expect(result.stockSubtracted![0].newQuantity).toBe(17)
  })

  it('sets inStock=false when depleted', async () => {
    const item = await prisma.providerInventoryItem.create({
      data: {
        providerUserId,
        providerType: 'DOCTOR',
        name: 'Deplete Test Item',
        category: 'other',
        price: 50,
        quantity: 1,
        inStock: true,
      },
    })
    createdItemIds.push(item.id)

    const ctx = makeContext({
      flags: { triggers_stock_subtract: true },
      input: {
        action: 'accept',
        actionByUserId: providerUserId,
        actionByRole: 'provider',
        inventoryItems: [{ itemId: item.id, quantity: 1 }],
      },
    })

    const result = await strategy.execute!(ctx)
    expect(result.stockSubtracted![0].newQuantity).toBe(0)

    const updated = await prisma.providerInventoryItem.findUnique({ where: { id: item.id } })
    expect(updated!.inStock).toBe(false)
  })

  it('sends low stock alert at threshold', async () => {
    const item = await prisma.providerInventoryItem.create({
      data: {
        providerUserId,
        providerType: 'DOCTOR',
        name: 'Alert Test Item',
        category: 'other',
        price: 50,
        quantity: 6,
        minStockAlert: 5,
        inStock: true,
      },
    })
    createdItemIds.push(item.id)

    const ctx = makeContext({
      flags: { triggers_stock_subtract: true },
      input: {
        action: 'accept',
        actionByUserId: providerUserId,
        actionByRole: 'provider',
        inventoryItems: [{ itemId: item.id, quantity: 2 }],
      },
    })

    await strategy.execute!(ctx)

    // Check that a low stock notification was created
    const alerts = await prisma.notification.findMany({
      where: {
        userId: providerUserId,
        type: 'stock_alert',
        message: { contains: 'Alert Test Item' },
      },
    })
    expect(alerts.length).toBeGreaterThanOrEqual(1)
  })
})

// ─── VideoCallStrategy ──────────────────────────────────────────────────────

describe('VideoCallStrategy', () => {
  const strategy = new VideoCallStrategy()

  it('creates a video room and returns roomId', async () => {
    const ctx = makeContext({
      flags: { triggers_video_call: true },
    })

    const result = await strategy.execute!(ctx)
    expect(result.videoCallId).toBeDefined()
    expect(typeof result.videoCallId).toBe('string')
    createdVideoRoomIds.push(result.videoCallId!)

    // Verify room was created in DB
    const room = await prisma.videoRoom.findUnique({
      where: { id: result.videoCallId! },
      include: { participants: true },
    })
    expect(room).not.toBeNull()
    expect(room!.status).toBe('active')
    expect(room!.participants).toHaveLength(2)
  })
})

// ─── ContentAttachmentStrategy ──────────────────────────────────────────────

describe('ContentAttachmentStrategy', () => {
  const strategy = new ContentAttachmentStrategy()

  it('passes when correct content type provided', async () => {
    const ctx = makeContext({
      flags: { requires_content: 'prescription' },
      input: {
        action: 'complete',
        actionByUserId: providerUserId,
        actionByRole: 'provider',
        contentType: 'prescription',
        contentData: { medications: [{ name: 'Test Drug' }] },
      },
    })

    const result = await strategy.validate!(ctx)
    expect(result.valid).toBe(true)
  })

  it('fails when content type missing', async () => {
    const ctx = makeContext({
      flags: { requires_content: 'lab_result' },
      input: {
        action: 'complete',
        actionByUserId: providerUserId,
        actionByRole: 'provider',
      },
    })

    const result = await strategy.validate!(ctx)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('lab_result')
  })

  it('fails when wrong content type', async () => {
    const ctx = makeContext({
      flags: { requires_content: 'prescription' },
      input: {
        action: 'complete',
        actionByUserId: providerUserId,
        actionByRole: 'provider',
        contentType: 'lab_result',
        contentData: { findings: 'Normal' },
      },
    })

    const result = await strategy.validate!(ctx)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('Expected content type "prescription"')
  })

  it('fails when content data empty', async () => {
    const ctx = makeContext({
      flags: { requires_content: 'care_notes' },
      input: {
        action: 'complete',
        actionByUserId: providerUserId,
        actionByRole: 'provider',
        contentType: 'care_notes',
        contentData: {},
      },
    })

    const result = await strategy.validate!(ctx)
    expect(result.valid).toBe(false)
  })
})

// ─── Health Shop Search ─────────────────────────────────────────────────────

describe('Health Shop Search', () => {
  const repo = inventoryRepo

  it('returns items with pagination', async () => {
    // Create a few items
    for (const name of ['Aspirin', 'Bandage', 'Thermometer']) {
      const item = await repo.createItem(providerUserId, 'DOCTOR', {
        name: `Search-${name}-${Date.now()}`,
        category: name === 'Aspirin' ? 'medication' : 'medical_devices',
        price: 100,
        quantity: 10,
      })
      createdItemIds.push(item.id)
    }

    const result = await repo.searchItems({ limit: 2, offset: 0 })
    expect(result.items.length).toBeLessThanOrEqual(2)
    expect(result.total).toBeGreaterThanOrEqual(3)
  })

  it('filters by category', async () => {
    const result = await repo.searchItems({ category: 'medication' })
    for (const item of result.items) {
      expect(item.category).toBe('medication')
    }
  })

  it('text search by name', async () => {
    const item = await repo.createItem(providerUserId, 'DOCTOR', {
      name: `UniqueSearchTerm-${Date.now()}`,
      category: 'other',
      price: 50,
      quantity: 5,
    })
    createdItemIds.push(item.id)

    const result = await repo.searchItems({ query: 'UniqueSearchTerm' })
    expect(result.items.length).toBeGreaterThanOrEqual(1)
  })
})
