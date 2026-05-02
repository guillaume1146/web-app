import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import type { StepFlagHandler, TransitionContext, StepFlagResult } from '../types';

@Injectable()
export class StockSubtractStrategy implements StepFlagHandler {
  flag = 'triggers_stock_subtract' as const;
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  async execute(ctx: TransitionContext): Promise<StepFlagResult> {
    const items = ctx.input.inventoryItems || [];
    const results: { itemId: string; newQuantity: number }[] = [];
    for (const item of items) {
      // Verify the item belongs to this booking's provider before mutating
      const owned = await this.prisma.providerInventoryItem.findFirst({
        where: { id: item.itemId, providerUserId: ctx.providerUserId },
        select: { id: true },
      });
      if (!owned) continue; // item doesn't belong to this provider — skip silently
      const updated = await this.prisma.providerInventoryItem.update({
        where: { id: item.itemId }, data: { quantity: { decrement: item.quantity } },
      });
      let finalQuantity = updated.quantity;
      if (updated.quantity <= 0) {
        await this.prisma.providerInventoryItem.update({ where: { id: item.itemId }, data: { inStock: false, quantity: 0 } });
        finalQuantity = 0;
      }
      if (updated.quantity > 0 && updated.quantity <= updated.minStockAlert) {
        await this.notifications.createNotification({
          userId: ctx.providerUserId, type: 'stock_alert', title: 'Low Stock Alert',
          message: `${updated.name} has only ${updated.quantity} ${updated.unitOfMeasure}(s) remaining`,
        });
      }
      results.push({ itemId: item.itemId, newQuantity: finalQuantity });
    }
    return { stockSubtracted: results };
  }
}
