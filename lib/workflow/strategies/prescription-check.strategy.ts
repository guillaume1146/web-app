import prisma from '@/lib/db'
import type { StepFlagHandler, TransitionContext } from '../types'

export class PrescriptionCheckStrategy implements StepFlagHandler {
  flag = 'requires_prescription' as const

  async validate(ctx: TransitionContext): Promise<{ valid: boolean; errors: string[] }> {
    const items = ctx.input.inventoryItems || []

    if (items.length === 0) {
      // No inventory items — check if there's a general prescription for this patient
      const prescription = await prisma.prescription.findFirst({
        where: {
          patient: { userId: ctx.patientUserId },
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!prescription) {
        return {
          valid: false,
          errors: ['A valid prescription is required for this step'],
        }
      }
      return { valid: true, errors: [] }
    }

    // Check which items require prescription
    const rxItems: string[] = []
    for (const item of items) {
      const inv = await prisma.providerInventoryItem.findUnique({
        where: { id: item.itemId },
        select: { name: true, requiresPrescription: true },
      })
      if (inv?.requiresPrescription) {
        rxItems.push(inv.name)
      }
    }

    if (rxItems.length === 0) {
      return { valid: true, errors: [] }
    }

    // Check if patient has valid prescription
    const prescription = await prisma.prescription.findFirst({
      where: {
        patient: { userId: ctx.patientUserId },
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!prescription) {
      return {
        valid: false,
        errors: [`Valid prescription required for: ${rxItems.join(', ')}`,],
      }
    }

    return { valid: true, errors: [] }
  }
}
