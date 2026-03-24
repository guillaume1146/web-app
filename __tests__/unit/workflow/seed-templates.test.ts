/**
 * Phase 5 — Seed Template Validation Tests
 *
 * Verifies seeded workflow templates are valid and cover all provider types.
 */
import { describe, it, expect, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Seeded Workflow Templates', () => {
  it('has templates for all major provider types', async () => {
    const expectedTypes = [
      'DOCTOR', 'NURSE', 'NANNY', 'LAB_TECHNICIAN', 'EMERGENCY_WORKER',
      'PHARMACIST', 'INSURANCE_REP', 'CAREGIVER', 'PHYSIOTHERAPIST',
      'DENTIST', 'OPTOMETRIST', 'NUTRITIONIST',
    ]

    for (const pt of expectedTypes) {
      const count = await prisma.workflowTemplate.count({
        where: { providerType: pt, isDefault: true },
      })
      expect(count, `${pt} should have at least 1 template`).toBeGreaterThanOrEqual(1)
    }
  })

  it('has at least 30 system default templates', async () => {
    const count = await prisma.workflowTemplate.count({
      where: { isDefault: true },
    })
    expect(count).toBeGreaterThanOrEqual(30)
  })

  it('all templates have valid steps JSON', async () => {
    const templates = await prisma.workflowTemplate.findMany({
      where: { isDefault: true },
      select: { id: true, slug: true, steps: true },
    })

    for (const tpl of templates) {
      const steps = tpl.steps as unknown[]
      expect(Array.isArray(steps), `${tpl.slug}: steps should be array`).toBe(true)
      expect(steps.length, `${tpl.slug}: should have at least 1 step`).toBeGreaterThanOrEqual(1)

      for (const step of steps) {
        const s = step as Record<string, unknown>
        expect(s.order, `${tpl.slug}: step missing order`).toBeDefined()
        expect(s.statusCode, `${tpl.slug}: step missing statusCode`).toBeDefined()
        expect(s.label, `${tpl.slug}: step missing label`).toBeDefined()
        expect(typeof s.statusCode).toBe('string')
      }
    }
  })

  it('all templates have valid transitions JSON', async () => {
    const templates = await prisma.workflowTemplate.findMany({
      where: { isDefault: true, slug: { not: { startsWith: 'engine-test' } } },
      select: { id: true, slug: true, transitions: true, steps: true },
    })

    for (const tpl of templates) {
      const transitions = tpl.transitions as unknown[]
      const steps = tpl.steps as { statusCode: string }[]
      const statusCodes = new Set(steps.map(s => s.statusCode))

      expect(Array.isArray(transitions), `${tpl.slug}: transitions should be array`).toBe(true)

      for (const trans of transitions) {
        const tr = trans as Record<string, unknown>
        expect(tr.from, `${tpl.slug}: transition missing 'from'`).toBeDefined()
        expect(tr.to, `${tpl.slug}: transition missing 'to'`).toBeDefined()
        expect(tr.action, `${tpl.slug}: transition missing 'action'`).toBeDefined()
        expect(tr.allowedRoles, `${tpl.slug}: transition missing 'allowedRoles'`).toBeDefined()

        // Verify 'from' and 'to' reference existing steps
        expect(statusCodes.has(tr.from as string), `${tpl.slug}: transition 'from' "${tr.from}" not in steps`).toBe(true)
        expect(statusCodes.has(tr.to as string), `${tpl.slug}: transition 'to' "${tr.to}" not in steps`).toBe(true)
      }
    }
  })

  it('office mode templates exist', async () => {
    const count = await prisma.workflowTemplate.count({
      where: { serviceMode: 'office', isDefault: true },
    })
    expect(count).toBeGreaterThanOrEqual(5)
  })

  it('home mode templates exist', async () => {
    const count = await prisma.workflowTemplate.count({
      where: { serviceMode: 'home', isDefault: true },
    })
    expect(count).toBeGreaterThanOrEqual(5)
  })

  it('video mode templates exist', async () => {
    const count = await prisma.workflowTemplate.count({
      where: { serviceMode: 'video', isDefault: true },
    })
    expect(count).toBeGreaterThanOrEqual(5)
  })

  it('templates have notification messages on key steps', async () => {
    const templates = await prisma.workflowTemplate.findMany({
      where: { isDefault: true },
      select: { slug: true, steps: true },
    })

    let templatesWithNotifications = 0
    for (const tpl of templates) {
      const steps = tpl.steps as { notifyPatient?: unknown; notifyProvider?: unknown }[]
      const hasNotif = steps.some(s => s.notifyPatient || s.notifyProvider)
      if (hasNotif) templatesWithNotifications++
    }

    // At least 90% of templates should have notifications
    expect(templatesWithNotifications / templates.length).toBeGreaterThanOrEqual(0.9)
  })

  it('confirmed steps have triggers_payment flag', async () => {
    const templates = await prisma.workflowTemplate.findMany({
      where: { isDefault: true },
      select: { slug: true, steps: true, providerType: true },
    })

    // Skip emergency (free) and insurance (no payment)
    const payableTemplates = templates.filter(
      t => !['EMERGENCY_WORKER', 'INSURANCE_REP'].includes(t.providerType)
    )

    let withPayment = 0
    for (const tpl of payableTemplates) {
      const steps = tpl.steps as { statusCode: string; flags: Record<string, unknown> }[]
      const confirmedStep = steps.find(s => s.statusCode === 'confirmed' || s.statusCode === 'order_confirmed')
      if (confirmedStep?.flags?.triggers_payment) withPayment++
    }

    // Most payable templates should have payment on confirmed
    expect(withPayment).toBeGreaterThanOrEqual(payableTemplates.length * 0.7)
  })

  it('completed steps have triggers_review_request flag', async () => {
    const templates = await prisma.workflowTemplate.findMany({
      where: { isDefault: true },
      select: { slug: true, steps: true },
    })

    let withReview = 0
    for (const tpl of templates) {
      const steps = tpl.steps as { statusCode: string; flags: Record<string, unknown> }[]
      const completedStep = steps.find(s =>
        s.statusCode === 'completed' || s.statusCode === 'resolved'
      )
      if (completedStep?.flags?.triggers_review_request) withReview++
    }

    expect(withReview).toBeGreaterThanOrEqual(templates.length * 0.8)
  })

  it('cancelled steps have triggers_refund flag', async () => {
    const templates = await prisma.workflowTemplate.findMany({
      where: { isDefault: true },
      select: { slug: true, steps: true, providerType: true },
    })

    const payable = templates.filter(
      t => !['EMERGENCY_WORKER', 'INSURANCE_REP'].includes(t.providerType)
    )

    let withRefund = 0
    for (const tpl of payable) {
      const steps = tpl.steps as { statusCode: string; flags: Record<string, unknown> }[]
      const cancelStep = steps.find(s => s.statusCode === 'cancelled')
      if (cancelStep?.flags?.triggers_refund) withRefund++
    }

    expect(withRefund).toBeGreaterThanOrEqual(payable.length * 0.8)
  })

  it('video templates have triggers_video_call flag', async () => {
    const templates = await prisma.workflowTemplate.findMany({
      where: { serviceMode: 'video', isDefault: true },
      select: { slug: true, steps: true },
    })

    let withVideoCall = 0
    for (const tpl of templates) {
      const steps = tpl.steps as { flags: Record<string, unknown> }[]
      if (steps.some(s => s.flags?.triggers_video_call)) withVideoCall++
    }

    expect(withVideoCall).toBe(templates.length) // All video templates should have it
  })

  it('pharmacy templates have stock-related flags', async () => {
    const templates = await prisma.workflowTemplate.findMany({
      where: { providerType: 'PHARMACIST', isDefault: true },
      select: { slug: true, steps: true },
    })

    let withStock = 0
    for (const tpl of templates) {
      const steps = tpl.steps as { flags: Record<string, unknown> }[]
      if (steps.some(s => s.flags?.triggers_stock_check || s.flags?.triggers_stock_subtract)) {
        withStock++
      }
    }

    expect(withStock).toBeGreaterThanOrEqual(1)
  })
})
