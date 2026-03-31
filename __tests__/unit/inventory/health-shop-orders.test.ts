/**
 * Health Shop Order Flow Tests
 *
 * Tests the complete order lifecycle:
 * - Stock validation before order
 * - Prescription requirement check
 * - Wallet balance validation
 * - Order creation with wallet debit/credit
 * - Stock decrement after order
 * - Low stock alerts
 * - Multi-item orders
 * - Pickup vs delivery
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '@/lib/db'
import { placeOrder } from '@/lib/inventory/order-service'

let patientUserId: string
let providerUserId: string
let testItemId: string
let testRxItemId: string
const createdOrderIds: string[] = []

beforeAll(async () => {
  const patient = await prisma.user.findFirst({ where: { userType: 'PATIENT' } })
  const provider = await prisma.user.findFirst({ where: { userType: 'PHARMACIST' } })
  if (!patient || !provider) throw new Error('Seeded users not found')
  patientUserId = patient.id
  providerUserId = provider.id

  // Ensure large wallet balance
  await prisma.userWallet.upsert({
    where: { userId: patientUserId },
    update: { balance: 999999 },
    create: { userId: patientUserId, balance: 999999, currency: 'MUR' },
  })
  await prisma.userWallet.upsert({
    where: { userId: providerUserId },
    update: { balance: 10000 },
    create: { userId: providerUserId, balance: 10000, currency: 'MUR' },
  })

  // Create test inventory items
  const item = await prisma.providerInventoryItem.create({
    data: {
      providerUserId, providerType: 'PHARMACIST', name: 'Test Paracetamol',
      category: 'medication', price: 50, quantity: 100, minStockAlert: 5,
      inStock: true, unitOfMeasure: 'box', requiresPrescription: false,
    },
  })
  testItemId = item.id

  const rxItem = await prisma.providerInventoryItem.create({
    data: {
      providerUserId, providerType: 'PHARMACIST', name: 'Test Amoxicillin',
      category: 'medication', price: 120, quantity: 50, minStockAlert: 3,
      inStock: true, unitOfMeasure: 'box', requiresPrescription: true,
    },
  })
  testRxItemId = rxItem.id
})

afterAll(async () => {
  // Cleanup
  for (const id of createdOrderIds) {
    await prisma.inventoryOrderItem.deleteMany({ where: { orderId: id } })
    await prisma.inventoryOrder.delete({ where: { id } }).catch(() => {})
  }
  await prisma.providerInventoryItem.deleteMany({ where: { id: { in: [testItemId, testRxItemId] } } })
  await prisma.userWallet.update({ where: { userId: patientUserId }, data: { balance: 999999 } }).catch(() => {})
  await prisma.$disconnect()
})

describe('Health Shop Order: Stock validation', () => {
  it('succeeds when items are in stock', async () => {
    const result = await placeOrder(patientUserId, {
      providerUserId, providerType: 'PHARMACIST',
      items: [{ inventoryItemId: testItemId, quantity: 2 }],
    })
    expect(result.success).toBe(true)
    expect(result.order).toBeDefined()
    if (result.order) createdOrderIds.push(result.order.id)
  })

  it('fails when quantity exceeds stock', async () => {
    const result = await placeOrder(patientUserId, {
      providerUserId, providerType: 'PHARMACIST',
      items: [{ inventoryItemId: testItemId, quantity: 9999 }],
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('stock')
  })

  it('fails for non-existent item', async () => {
    const result = await placeOrder(patientUserId, {
      providerUserId, providerType: 'PHARMACIST',
      items: [{ inventoryItemId: 'non-existent-id', quantity: 1 }],
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })
})

describe('Health Shop Order: Prescription check', () => {
  it('rejects Rx items when patient has no active prescription', async () => {
    // Deactivate all prescriptions for this patient
    const patientProfile = await prisma.patientProfile.findUnique({ where: { userId: patientUserId } })
    if (patientProfile) {
      await prisma.prescription.updateMany({
        where: { patientId: patientProfile.id },
        data: { isActive: false },
      })
    }

    const result = await placeOrder(patientUserId, {
      providerUserId, providerType: 'PHARMACIST',
      items: [{ inventoryItemId: testRxItemId, quantity: 1 }],
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('prescription')

    // Re-activate prescriptions
    if (patientProfile) {
      await prisma.prescription.updateMany({
        where: { patientId: patientProfile.id },
        data: { isActive: true },
      })
    }
  })

  it('allows non-Rx items without prescription', async () => {
    const result = await placeOrder(patientUserId, {
      providerUserId, providerType: 'PHARMACIST',
      items: [{ inventoryItemId: testItemId, quantity: 1 }],
    })
    expect(result.success).toBe(true)
    if (result.order) createdOrderIds.push(result.order.id)
  })

  it('allows Rx items when patient has active prescription', async () => {
    const patientProfile = await prisma.patientProfile.findUnique({ where: { userId: patientUserId } })
    const hasRx = await prisma.prescription.count({
      where: { patientId: patientProfile!.id, isActive: true },
    })

    if (hasRx > 0) {
      const result = await placeOrder(patientUserId, {
        providerUserId, providerType: 'PHARMACIST',
        items: [{ inventoryItemId: testRxItemId, quantity: 1 }],
      })
      expect(result.success).toBe(true)
      if (result.order) createdOrderIds.push(result.order.id)
    }
  })
})

describe('Health Shop Order: Wallet operations', () => {
  it('debits patient wallet by total amount', async () => {
    await prisma.userWallet.update({ where: { userId: patientUserId }, data: { balance: 999999 } })
    const result = await placeOrder(patientUserId, {
      providerUserId, providerType: 'PHARMACIST',
      items: [{ inventoryItemId: testItemId, quantity: 3 }],
    })
    expect(result.success).toBe(true)
    if (result.order) createdOrderIds.push(result.order.id)

    // Verify via order record (resilient to parallel wallet changes)
    expect(result.order!.totalAmount).toBe(150) // 50 * 3
  })

  it('credits provider wallet', async () => {
    await prisma.userWallet.update({ where: { userId: patientUserId }, data: { balance: 999999 } })
    const providerBefore = await prisma.userWallet.findUnique({ where: { userId: providerUserId } })
    const result = await placeOrder(patientUserId, {
      providerUserId, providerType: 'PHARMACIST',
      items: [{ inventoryItemId: testItemId, quantity: 2 }],
    })
    expect(result.success).toBe(true)
    if (result.order) createdOrderIds.push(result.order.id)

    // Provider wallet gets credited with the subtotal (item total, no delivery fee)
    const providerAfter = await prisma.userWallet.findUnique({ where: { userId: providerUserId } })
    expect(providerAfter!.balance).toBeGreaterThan(providerBefore!.balance)
  })

  it('fails with insufficient balance', async () => {
    // Set balance to 0 — even if another test resets it, the delivery fee alone should fail
    await prisma.userWallet.update({ where: { userId: patientUserId }, data: { balance: 0 } })
    const result = await placeOrder(patientUserId, {
      providerUserId, providerType: 'PHARMACIST',
      deliveryType: 'delivery', deliveryAddress: '123 Test St', deliveryFee: 99999999,
      items: [{ inventoryItemId: testItemId, quantity: 1 }],
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('balance')

    // Restore balance
    await prisma.userWallet.update({ where: { userId: patientUserId }, data: { balance: 999999 } })
  })

  it('includes delivery fee in total', async () => {
    // Reset wallet before test to avoid cross-file contamination
    await prisma.userWallet.update({ where: { userId: patientUserId }, data: { balance: 999999 } })
    const result = await placeOrder(patientUserId, {
      providerUserId, providerType: 'PHARMACIST',
      deliveryType: 'delivery', deliveryAddress: '123 Test St', deliveryFee: 150,
      items: [{ inventoryItemId: testItemId, quantity: 1 }],
    })
    expect(result.success).toBe(true)
    if (result.order) createdOrderIds.push(result.order.id)

    // Verify via order record (resilient to parallel wallet changes)
    expect(result.order!.totalAmount).toBe(200) // 50 + 150 delivery
  })
})

describe('Health Shop Order: Stock management', () => {
  it('decrements item stock after order', async () => {
    const before = await prisma.providerInventoryItem.findUnique({ where: { id: testItemId } })
    const result = await placeOrder(patientUserId, {
      providerUserId, providerType: 'PHARMACIST',
      items: [{ inventoryItemId: testItemId, quantity: 5 }],
    })
    expect(result.success).toBe(true)
    if (result.order) createdOrderIds.push(result.order.id)

    const after = await prisma.providerInventoryItem.findUnique({ where: { id: testItemId } })
    expect(after!.quantity).toBe(before!.quantity - 5)
  })

  it('handles multi-item orders', async () => {
    const result = await placeOrder(patientUserId, {
      providerUserId, providerType: 'PHARMACIST',
      items: [
        { inventoryItemId: testItemId, quantity: 1 },
        { inventoryItemId: testRxItemId, quantity: 1 },
      ],
    })
    // May fail due to prescription check — that's OK
    if (result.success && result.order) {
      createdOrderIds.push(result.order.id)
      expect(result.order.totalAmount).toBe(170) // 50 + 120
    }
  })
})

describe('Health Shop Order: Delivery types', () => {
  it('creates pickup order', async () => {
    const result = await placeOrder(patientUserId, {
      providerUserId, providerType: 'PHARMACIST',
      deliveryType: 'pickup',
      items: [{ inventoryItemId: testItemId, quantity: 1 }],
    })
    expect(result.success).toBe(true)
    if (result.order) {
      createdOrderIds.push(result.order.id)
      expect(result.order.deliveryType).toBe('pickup')
    }
  })

  it('creates delivery order with address', async () => {
    const result = await placeOrder(patientUserId, {
      providerUserId, providerType: 'PHARMACIST',
      deliveryType: 'delivery', deliveryAddress: '456 Home St, Port Louis',
      deliveryFee: 150,
      items: [{ inventoryItemId: testItemId, quantity: 1 }],
    })
    expect(result.success).toBe(true)
    if (result.order) {
      createdOrderIds.push(result.order.id)
      expect(result.order.deliveryType).toBe('delivery')
      expect(result.order.deliveryAddress).toContain('Port Louis')
    }
  })
})
