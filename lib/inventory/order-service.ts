/**
 * Inventory Order Service — handles order creation with stock validation and wallet operations.
 */
import prisma from '@/lib/db'
import { createNotification } from '@/lib/notifications'
import * as repo from './repository'
import type { CreateOrderInput } from './types'

export interface OrderResult {
  success: boolean
  order?: Awaited<ReturnType<typeof repo.createOrder>>
  error?: string
}

export async function placeOrder(
  patientUserId: string,
  input: CreateOrderInput
): Promise<OrderResult> {
  // 1. Fetch all items and validate
  const itemDetails = await Promise.all(
    input.items.map(async (item) => {
      const inv = await repo.findItemById(item.inventoryItemId)
      return { ...item, inv }
    })
  )

  // Check all items exist and are active
  for (const item of itemDetails) {
    if (!item.inv || !item.inv.isActive) {
      return { success: false, error: `Item not found: ${item.inventoryItemId}` }
    }
    if (!item.inv.inStock || item.inv.quantity < item.quantity) {
      return { success: false, error: `Insufficient stock for: ${item.inv.name}` }
    }
  }

  // 2. Check prescription requirements
  const prescriptionRequired = itemDetails.some((item) => item.inv!.requiresPrescription)

  // 3. Calculate totals
  const itemsWithPricing = itemDetails.map((item) => ({
    inventoryItemId: item.inventoryItemId,
    quantity: item.quantity,
    unitPrice: item.inv!.price,
    totalPrice: item.inv!.price * item.quantity,
  }))

  const subtotal = itemsWithPricing.reduce((sum, item) => sum + item.totalPrice, 0)
  const deliveryFee = input.deliveryFee ?? 0
  const totalAmount = subtotal + deliveryFee

  // 4. Check patient wallet balance
  const wallet = await prisma.userWallet.findUnique({
    where: { userId: patientUserId },
    select: { balance: true },
  })

  if (!wallet || wallet.balance < totalAmount) {
    return { success: false, error: `Insufficient wallet balance. Required: ${totalAmount} Rs` }
  }

  // 5. Execute order in transaction
  const order = await prisma.$transaction(async (tx) => {
    // Debit patient wallet
    await tx.userWallet.update({
      where: { userId: patientUserId },
      data: { balance: { decrement: totalAmount } },
    })

    // Credit provider wallet
    const providerWallet = await tx.userWallet.findUnique({
      where: { userId: input.providerUserId },
    })
    if (providerWallet) {
      await tx.userWallet.update({
        where: { userId: input.providerUserId },
        data: { balance: { increment: subtotal } },
      })
    }

    // Create wallet transactions
    const patientWalletRecord = await tx.userWallet.findUnique({ where: { userId: patientUserId } })
    if (patientWalletRecord) {
      await tx.walletTransaction.create({
        data: {
          walletId: patientWalletRecord.id,
          type: 'debit',
          amount: totalAmount,
          description: 'Health Shop order',
          serviceType: 'shop',
          status: 'completed',
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance - totalAmount,
        },
      })
    }

    if (providerWallet) {
      await tx.walletTransaction.create({
        data: {
          walletId: providerWallet.id,
          type: 'credit',
          amount: subtotal,
          description: 'Health Shop sale',
          serviceType: 'shop',
          status: 'completed',
          balanceBefore: providerWallet.balance,
          balanceAfter: providerWallet.balance + subtotal,
        },
      })
    }

    // Decrement stock for each item
    for (const item of itemDetails) {
      await tx.providerInventoryItem.update({
        where: { id: item.inventoryItemId },
        data: {
          quantity: { decrement: item.quantity },
        },
      })

      // Check if stock is now depleted
      const updated = await tx.providerInventoryItem.findUnique({
        where: { id: item.inventoryItemId },
        select: { quantity: true, minStockAlert: true, name: true },
      })

      if (updated && updated.quantity <= 0) {
        await tx.providerInventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { inStock: false, quantity: 0 },
        })
      }

      // Low stock alert
      if (updated && updated.quantity > 0 && updated.quantity <= updated.minStockAlert) {
        await createNotification({
          userId: input.providerUserId,
          type: 'stock_alert',
          title: 'Low Stock Alert',
          message: `${updated.name} has only ${updated.quantity} remaining`,
        })
      }
    }

    // Create the order
    return tx.inventoryOrder.create({
      data: {
        patientUserId,
        providerUserId: input.providerUserId,
        providerType: input.providerType,
        totalAmount,
        deliveryType: input.deliveryType,
        deliveryAddress: input.deliveryAddress,
        deliveryFee,
        prescriptionRequired,
        items: {
          create: itemsWithPricing,
        },
      },
      include: { items: true },
    })
  })

  // 6. Notify provider
  await createNotification({
    userId: input.providerUserId,
    type: 'shop_order',
    title: 'New Order Received',
    message: `New order of ${input.items.length} item(s) — ${totalAmount} Rs`,
    referenceId: order.id,
    referenceType: 'inventory_order',
  })

  return { success: true, order }
}
