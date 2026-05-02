import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { StepFlagHandler, TransitionContext } from '../types';

@Injectable()
export class PrescriptionCheckStrategy implements StepFlagHandler {
  flag = 'requires_prescription' as const;
  constructor(private prisma: PrismaService) {}

  async validate(ctx: TransitionContext): Promise<{ valid: boolean; errors: string[] }> {
    const items = ctx.input.inventoryItems || [];
    if (items.length === 0) {
      const prescription = await this.prisma.prescription.findFirst({
        where: { patient: { userId: ctx.patientUserId }, isActive: true }, orderBy: { createdAt: 'desc' },
      });
      if (!prescription) return { valid: false, errors: ['A valid prescription is required for this step'] };
      return { valid: true, errors: [] };
    }
    const rxItems: string[] = [];
    for (const item of items) {
      const inv = await this.prisma.providerInventoryItem.findUnique({ where: { id: item.itemId }, select: { name: true, requiresPrescription: true } });
      if (inv?.requiresPrescription) rxItems.push(inv.name);
    }
    if (rxItems.length === 0) return { valid: true, errors: [] };
    const prescription = await this.prisma.prescription.findFirst({
      where: { patient: { userId: ctx.patientUserId }, isActive: true }, orderBy: { createdAt: 'desc' },
    });
    if (!prescription) return { valid: false, errors: [`Valid prescription required for: ${rxItems.join(', ')}`] };
    return { valid: true, errors: [] };
  }
}
