/**
 * Provider Inventory — Data Access
 */
import prisma from '@/lib/db'
import type { ProviderInventoryItem, InventoryOrder } from '@prisma/client'
import type { CreateInventoryItemInput } from './types'

// ─── Inventory Items ────────────────────────────────────────────────────────

export async function findItemById(id: string) {
  return prisma.providerInventoryItem.findUnique({ where: { id } })
}

export async function findItemsByProvider(providerUserId: string) {
  return prisma.providerInventoryItem.findMany({
    where: { providerUserId, isActive: true },
    orderBy: { name: 'asc' },
  })
}

export async function searchItems(filters: {
  query?: string
  category?: string
  providerType?: string
  requiresPrescription?: boolean
  inStock?: boolean
  limit?: number
  offset?: number
}) {
  const where = {
    isActive: true,
    inStock: filters.inStock ?? true,
    ...(filters.category && { category: filters.category }),
    ...(filters.providerType && { providerType: filters.providerType }),
    ...(filters.requiresPrescription !== undefined && { requiresPrescription: filters.requiresPrescription }),
    ...(filters.query && {
      OR: [
        { name: { contains: filters.query, mode: 'insensitive' as const } },
        { genericName: { contains: filters.query, mode: 'insensitive' as const } },
        { description: { contains: filters.query, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [items, total] = await Promise.all([
    prisma.providerInventoryItem.findMany({
      where,
      take: filters.limit ?? 20,
      skip: filters.offset ?? 0,
      orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
    }),
    prisma.providerInventoryItem.count({ where }),
  ])

  return { items, total }
}

export async function createItem(
  providerUserId: string,
  providerType: string,
  input: CreateInventoryItemInput
): Promise<ProviderInventoryItem> {
  return prisma.providerInventoryItem.create({
    data: {
      providerUserId,
      providerType,
      ...input,
      inStock: input.quantity > 0,
    },
  })
}

export async function updateItem(
  id: string,
  data: Partial<CreateInventoryItemInput & { isActive: boolean; inStock: boolean }>
): Promise<ProviderInventoryItem> {
  return prisma.providerInventoryItem.update({ where: { id }, data })
}

export async function deactivateItem(id: string): Promise<ProviderInventoryItem> {
  return prisma.providerInventoryItem.update({
    where: { id },
    data: { isActive: false },
  })
}

export async function decrementStock(id: string, quantity: number) {
  const item = await prisma.providerInventoryItem.update({
    where: { id },
    data: { quantity: { decrement: quantity } },
  })

  // Auto-update inStock if depleted
  if (item.quantity <= 0) {
    await prisma.providerInventoryItem.update({
      where: { id },
      data: { inStock: false, quantity: 0 },
    })
    return { ...item, quantity: 0, inStock: false }
  }

  return item
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export async function findOrderById(id: string) {
  return prisma.inventoryOrder.findUnique({
    where: { id },
    include: { items: { include: { inventoryItem: true } } },
  })
}

export async function findOrdersByPatient(patientUserId: string) {
  return prisma.inventoryOrder.findMany({
    where: { patientUserId },
    include: { items: { include: { inventoryItem: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function findOrdersByProvider(providerUserId: string) {
  return prisma.inventoryOrder.findMany({
    where: { providerUserId },
    include: { items: { include: { inventoryItem: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createOrder(data: {
  patientUserId: string
  providerUserId: string
  providerType: string
  totalAmount: number
  deliveryType?: string
  deliveryAddress?: string
  deliveryFee?: number
  prescriptionRequired: boolean
  items: { inventoryItemId: string; quantity: number; unitPrice: number; totalPrice: number }[]
}): Promise<InventoryOrder> {
  return prisma.inventoryOrder.create({
    data: {
      patientUserId: data.patientUserId,
      providerUserId: data.providerUserId,
      providerType: data.providerType,
      totalAmount: data.totalAmount,
      deliveryType: data.deliveryType,
      deliveryAddress: data.deliveryAddress,
      deliveryFee: data.deliveryFee ?? 0,
      prescriptionRequired: data.prescriptionRequired,
      items: {
        create: data.items.map((item) => ({
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      },
    },
    include: { items: true },
  })
}

export async function updateOrderStatus(
  id: string,
  status: string,
  extra?: { confirmedAt?: Date; deliveredAt?: Date; cancelledAt?: Date }
): Promise<InventoryOrder> {
  return prisma.inventoryOrder.update({
    where: { id },
    data: { status, ...extra },
  })
}
