import prisma from '@/lib/db'
import type { StepFlagHandler, TransitionContext, StepFlagResult } from '../types'

export class StockCheckStrategy implements StepFlagHandler {
  flag = 'triggers_stock_check' as const

  async validate(ctx: TransitionContext): Promise<{ valid: boolean; errors: string[] }> {
    const items = ctx.input.inventoryItems || []

    if (items.length === 0) {
      return { valid: true, errors: [] }
    }

    const unavailable: string[] = []

    for (const item of items) {
      const inv = await prisma.providerInventoryItem.findUnique({
        where: { id: item.itemId },
        select: { name: true, quantity: true, inStock: true, isActive: true },
      })

      if (!inv || !inv.isActive) {
        unavailable.push(`Item not found: ${item.itemId}`)
      } else if (!inv.inStock || inv.quantity < item.quantity) {
        unavailable.push(`${inv.name}: only ${inv.quantity} available (requested ${item.quantity})`)
      }
    }

    return {
      valid: unavailable.length === 0,
      errors: unavailable,
    }
  }
}
