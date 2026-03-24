import prisma from '@/lib/db'
import { createNotification } from '@/lib/notifications'
import type { StepFlagHandler, TransitionContext, StepFlagResult } from '../types'

export class StockSubtractStrategy implements StepFlagHandler {
  flag = 'triggers_stock_subtract' as const

  async execute(ctx: TransitionContext): Promise<StepFlagResult> {
    const items = ctx.input.inventoryItems || []
    const results: { itemId: string; newQuantity: number }[] = []

    for (const item of items) {
      const updated = await prisma.providerInventoryItem.update({
        where: { id: item.itemId },
        data: { quantity: { decrement: item.quantity } },
      })

      let finalQuantity = updated.quantity

      // Auto-update inStock if depleted
      if (updated.quantity <= 0) {
        await prisma.providerInventoryItem.update({
          where: { id: item.itemId },
          data: { inStock: false, quantity: 0 },
        })
        finalQuantity = 0
      }

      // Low stock alert
      if (updated.quantity > 0 && updated.quantity <= updated.minStockAlert) {
        await createNotification({
          userId: ctx.providerUserId,
          type: 'stock_alert',
          title: 'Low Stock Alert',
          message: `${updated.name} has only ${updated.quantity} ${updated.unitOfMeasure}(s) remaining`,
        })
      }

      results.push({ itemId: item.itemId, newQuantity: finalQuantity })
    }

    return { stockSubtracted: results }
  }
}
