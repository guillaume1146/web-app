/**
 * Phase 1 — Schema Validation Tests
 *
 * Verifies that all new Prisma models exist and work correctly.
 * These tests run against a real database (must be running).
 */
import { describe, it, expect, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

afterAll(async () => {
  await prisma.$disconnect()
})

// ─── WorkflowTemplate ──────────────────────────────────────────────────────

describe('WorkflowTemplate model', () => {
  const testId = 'wft-test-' + Date.now()

  afterAll(async () => {
    await prisma.workflowTemplate.deleteMany({ where: { id: testId } })
  })

  it('can create a workflow template', async () => {
    const template = await prisma.workflowTemplate.create({
      data: {
        id: testId,
        name: 'Test Consultation - Office',
        slug: 'test-consultation-office-' + Date.now(),
        providerType: 'DOCTOR',
        serviceMode: 'office',
        isDefault: true,
        steps: [
          {
            order: 1,
            statusCode: 'pending',
            label: 'Demande envoyee',
            actionsForPatient: [{ action: 'cancel', label: 'Annuler', targetStatus: 'cancelled', style: 'danger' }],
            actionsForProvider: [{ action: 'accept', label: 'Accepter', targetStatus: 'confirmed', style: 'primary' }],
            flags: {},
            notifyPatient: null,
            notifyProvider: { title: 'New request', message: 'A patient requested a consultation' },
          },
          {
            order: 2,
            statusCode: 'confirmed',
            label: 'Confirmed',
            actionsForPatient: [],
            actionsForProvider: [{ action: 'complete', label: 'Complete', targetStatus: 'completed', style: 'primary' }],
            flags: { triggers_video_call: true },
            notifyPatient: { title: 'Confirmed', message: 'Your consultation is confirmed' },
            notifyProvider: null,
          },
          {
            order: 3,
            statusCode: 'completed',
            label: 'Completed',
            actionsForPatient: [],
            actionsForProvider: [],
            flags: {},
          },
        ],
        transitions: [
          { from: 'pending', to: 'confirmed', action: 'accept', allowedRoles: ['provider'] },
          { from: 'pending', to: 'cancelled', action: 'cancel', allowedRoles: ['patient'] },
          { from: 'confirmed', to: 'completed', action: 'complete', allowedRoles: ['provider'] },
        ],
      },
    })

    expect(template.id).toBe(testId)
    expect(template.name).toBe('Test Consultation - Office')
    expect(template.providerType).toBe('DOCTOR')
    expect(template.serviceMode).toBe('office')
    expect(template.isDefault).toBe(true)
    expect(template.isActive).toBe(true)
    expect(template.createdByProviderId).toBeNull()
    expect(template.createdByAdminId).toBeNull()
    expect(template.regionCode).toBeNull()
    expect(template.platformServiceId).toBeNull()
  })

  it('can read steps and transitions as JSON', async () => {
    const template = await prisma.workflowTemplate.findUnique({
      where: { id: testId },
    })

    expect(template).not.toBeNull()
    const steps = template!.steps as unknown[]
    expect(Array.isArray(steps)).toBe(true)
    expect(steps).toHaveLength(3)

    const firstStep = steps[0] as Record<string, unknown>
    expect(firstStep.statusCode).toBe('pending')
    expect(firstStep.order).toBe(1)
    expect(firstStep.flags).toEqual({})

    const secondStep = steps[1] as Record<string, unknown>
    const flags = secondStep.flags as Record<string, boolean>
    expect(flags.triggers_video_call).toBe(true)

    const transitions = template!.transitions as unknown[]
    expect(Array.isArray(transitions)).toBe(true)
    expect(transitions).toHaveLength(3)
  })

  it('enforces unique slug constraint', async () => {
    const slug = 'test-unique-slug-' + Date.now()

    await prisma.workflowTemplate.create({
      data: {
        name: 'Template A',
        slug,
        providerType: 'NURSE',
        serviceMode: 'home',
        steps: [],
        transitions: [],
      },
    })

    await expect(
      prisma.workflowTemplate.create({
        data: {
          name: 'Template B',
          slug, // duplicate
          providerType: 'NURSE',
          serviceMode: 'home',
          steps: [],
          transitions: [],
        },
      })
    ).rejects.toThrow()

    // Cleanup
    await prisma.workflowTemplate.deleteMany({ where: { slug } })
  })

  it('can link to PlatformService', async () => {
    const service = await prisma.platformService.findFirst({
      where: { providerType: 'DOCTOR' },
    })

    if (!service) {
      console.warn('No PlatformService found for DOCTOR — skipping link test')
      return
    }

    const slug = 'test-linked-' + Date.now()
    const linked = await prisma.workflowTemplate.create({
      data: {
        name: 'Linked Template',
        slug,
        providerType: 'DOCTOR',
        serviceMode: 'video',
        platformServiceId: service.id,
        steps: [],
        transitions: [],
      },
      include: { platformService: true },
    })

    expect(linked.platformServiceId).toBe(service.id)
    expect(linked.platformService).not.toBeNull()
    expect(linked.platformService!.serviceName).toBe(service.serviceName)

    await prisma.workflowTemplate.delete({ where: { id: linked.id } })
  })
})

// ─── WorkflowInstance ───────────────────────────────────────────────────────

describe('WorkflowInstance model', () => {
  let templateId: string

  afterAll(async () => {
    await prisma.workflowStepLog.deleteMany({ where: { instance: { templateId } } })
    await prisma.workflowInstance.deleteMany({ where: { templateId } })
    await prisma.workflowTemplate.deleteMany({ where: { id: templateId } })
  })

  it('can create an instance linked to a template', async () => {
    // Create template first
    const template = await prisma.workflowTemplate.create({
      data: {
        name: 'Instance Test Template',
        slug: 'instance-test-' + Date.now(),
        providerType: 'DOCTOR',
        serviceMode: 'office',
        steps: [{ order: 1, statusCode: 'pending', label: 'Pending' }],
        transitions: [],
      },
    })
    templateId = template.id

    const instance = await prisma.workflowInstance.create({
      data: {
        templateId: template.id,
        bookingId: 'APT-TEST-001',
        bookingType: 'appointment',
        currentStatus: 'pending',
        patientUserId: 'test-patient-id',
        providerUserId: 'test-provider-id',
        serviceMode: 'office',
      },
    })

    expect(instance.templateId).toBe(template.id)
    expect(instance.bookingId).toBe('APT-TEST-001')
    expect(instance.bookingType).toBe('appointment')
    expect(instance.currentStatus).toBe('pending')
    expect(instance.previousStatus).toBeNull()
    expect(instance.completedAt).toBeNull()
    expect(instance.cancelledAt).toBeNull()
  })

  it('can update currentStatus and previousStatus', async () => {
    const instance = await prisma.workflowInstance.findFirst({
      where: { templateId },
    })

    const updated = await prisma.workflowInstance.update({
      where: { id: instance!.id },
      data: {
        previousStatus: 'pending',
        currentStatus: 'confirmed',
      },
    })

    expect(updated.previousStatus).toBe('pending')
    expect(updated.currentStatus).toBe('confirmed')
  })

  it('can set completedAt', async () => {
    const instance = await prisma.workflowInstance.findFirst({
      where: { templateId },
    })

    const updated = await prisma.workflowInstance.update({
      where: { id: instance!.id },
      data: {
        currentStatus: 'completed',
        completedAt: new Date(),
      },
    })

    expect(updated.completedAt).not.toBeNull()
    expect(updated.currentStatus).toBe('completed')
  })
})

// ─── WorkflowStepLog ────────────────────────────────────────────────────────

describe('WorkflowStepLog model', () => {
  let templateId: string
  let instanceId: string

  afterAll(async () => {
    await prisma.workflowStepLog.deleteMany({ where: { instanceId } })
    await prisma.workflowInstance.deleteMany({ where: { id: instanceId } })
    await prisma.workflowTemplate.deleteMany({ where: { id: templateId } })
  })

  it('can create step log entries with content', async () => {
    const template = await prisma.workflowTemplate.create({
      data: {
        name: 'StepLog Test',
        slug: 'steplog-test-' + Date.now(),
        providerType: 'DENTIST',
        serviceMode: 'office',
        steps: [],
        transitions: [],
      },
    })
    templateId = template.id

    const instance = await prisma.workflowInstance.create({
      data: {
        templateId: template.id,
        bookingId: 'SB-TEST-001',
        bookingType: 'service_booking',
        currentStatus: 'pending',
        patientUserId: 'p1',
        providerUserId: 'pr1',
        serviceMode: 'office',
      },
    })
    instanceId = instance.id

    // Create step log with content attachment
    const log = await prisma.workflowStepLog.create({
      data: {
        instanceId: instance.id,
        fromStatus: null,
        toStatus: 'pending',
        action: 'create',
        actionByUserId: 'p1',
        actionByRole: 'patient',
        label: 'Demande envoyee',
        message: 'Patient a soumis une demande',
      },
    })

    expect(log.fromStatus).toBeNull()
    expect(log.toStatus).toBe('pending')
    expect(log.action).toBe('create')
    expect(log.actionByRole).toBe('patient')
    expect(log.contentType).toBeNull()
    expect(log.contentData).toBeNull()

    // Create step log with prescription content
    const logWithContent = await prisma.workflowStepLog.create({
      data: {
        instanceId: instance.id,
        fromStatus: 'in_consultation',
        toStatus: 'writing_prescription',
        action: 'write_prescription',
        actionByUserId: 'pr1',
        actionByRole: 'provider',
        label: 'Redaction ordonnance',
        contentType: 'prescription',
        contentData: {
          medications: [
            { name: 'Paracetamol', dosage: '500mg', frequency: '3x/day', duration: '5 days' },
            { name: 'Amoxicillin', dosage: '250mg', frequency: '2x/day', duration: '7 days' },
          ],
          notes: 'Take with food',
        },
      },
    })

    expect(logWithContent.contentType).toBe('prescription')
    const content = logWithContent.contentData as Record<string, unknown>
    const meds = content.medications as unknown[]
    expect(meds).toHaveLength(2)

    // Create step log with triggered video call
    const logWithVideo = await prisma.workflowStepLog.create({
      data: {
        instanceId: instance.id,
        fromStatus: 'confirmed',
        toStatus: 'call_ready',
        action: 'prepare_call',
        actionByUserId: 'system',
        actionByRole: 'system',
        label: 'Salle prete',
        triggeredVideoCallId: 'room-123-abc',
      },
    })

    expect(logWithVideo.triggeredVideoCallId).toBe('room-123-abc')

    // Create step log with stock actions
    const logWithStock = await prisma.workflowStepLog.create({
      data: {
        instanceId: instance.id,
        fromStatus: 'stock_check',
        toStatus: 'preparing',
        action: 'confirm_stock',
        actionByUserId: 'pr1',
        actionByRole: 'provider',
        label: 'Stock verifie',
        triggeredStockActions: [
          { itemId: 'item-1', qty: 2, action: 'subtract' },
          { itemId: 'item-2', qty: 1, action: 'subtract' },
        ],
      },
    })

    expect(logWithStock.triggeredStockActions).not.toBeNull()
    const stockActions = logWithStock.triggeredStockActions as unknown[]
    expect(stockActions).toHaveLength(2)
  })

  it('can query step logs by instance (timeline)', async () => {
    const timeline = await prisma.workflowStepLog.findMany({
      where: { instanceId },
      orderBy: { createdAt: 'asc' },
    })

    expect(timeline.length).toBeGreaterThanOrEqual(4)
    expect(timeline[0].toStatus).toBe('pending')
    expect(timeline[0].fromStatus).toBeNull()
  })
})

// ─── WorkflowNotificationTemplate ───────────────────────────────────────────

describe('WorkflowNotificationTemplate model', () => {
  let templateId: string

  afterAll(async () => {
    await prisma.workflowNotificationTemplate.deleteMany({ where: { workflowTemplateId: templateId } })
    await prisma.workflowTemplate.deleteMany({ where: { id: templateId } })
  })

  it('can create custom notification templates', async () => {
    const template = await prisma.workflowTemplate.create({
      data: {
        name: 'Notif Test',
        slug: 'notif-test-' + Date.now(),
        providerType: 'PHARMACIST',
        serviceMode: 'office',
        steps: [],
        transitions: [],
      },
    })
    templateId = template.id

    const notif = await prisma.workflowNotificationTemplate.create({
      data: {
        workflowTemplateId: template.id,
        statusCode: 'confirmed',
        targetRole: 'patient',
        title: 'Commande confirmee par {{providerName}}',
        message: 'Votre commande de {{serviceName}} est confirmee. Montant: {{amount}}',
      },
    })

    expect(notif.statusCode).toBe('confirmed')
    expect(notif.targetRole).toBe('patient')
    expect(notif.title).toContain('{{providerName}}')
    expect(notif.notificationType).toBe('workflow')
  })

  it('enforces unique constraint on template+status+role+provider', async () => {
    const providerId = 'test-provider-unique-' + Date.now()

    // Create first with a specific provider
    await prisma.workflowNotificationTemplate.create({
      data: {
        workflowTemplateId: templateId,
        statusCode: 'pending',
        targetRole: 'provider',
        title: 'First',
        message: 'First entry',
        createdByProviderId: providerId,
      },
    })

    // Same combo should fail
    await expect(
      prisma.workflowNotificationTemplate.create({
        data: {
          workflowTemplateId: templateId,
          statusCode: 'pending',
          targetRole: 'provider',
          title: 'Duplicate',
          message: 'Should fail',
          createdByProviderId: providerId,
        },
      })
    ).rejects.toThrow()
  })
})

// ─── ProviderInventoryItem ──────────────────────────────────────────────────

describe('ProviderInventoryItem model', () => {
  const ids: string[] = []

  afterAll(async () => {
    await prisma.providerInventoryItem.deleteMany({ where: { id: { in: ids } } })
  })

  it('can create items for pharmacist (medicines)', async () => {
    const item = await prisma.providerInventoryItem.create({
      data: {
        providerUserId: 'pharm-test-user',
        providerType: 'PHARMACIST',
        name: 'Vitamin C 500mg',
        category: 'vitamins',
        description: 'Vitamin C supplement',
        unitOfMeasure: 'box',
        strength: '500mg',
        dosageForm: 'tablet',
        price: 150,
        quantity: 100,
        inStock: true,
        requiresPrescription: false,
        sideEffects: ['Mild stomach upset'],
      },
    })

    ids.push(item.id)
    expect(item.providerType).toBe('PHARMACIST')
    expect(item.requiresPrescription).toBe(false)
    expect(item.unitOfMeasure).toBe('box')
    expect(item.quantity).toBe(100)
    expect(item.minStockAlert).toBe(5)
    expect(item.isFeatured).toBe(false)
  })

  it('can create items for optometrist (eyewear)', async () => {
    const item = await prisma.providerInventoryItem.create({
      data: {
        providerUserId: 'opto-test-user',
        providerType: 'OPTOMETRIST',
        name: 'Blue Light Blocking Glasses',
        category: 'eyewear',
        description: 'Computer glasses with blue light filter',
        unitOfMeasure: 'pair',
        price: 2500,
        quantity: 25,
        inStock: true,
        requiresPrescription: false,
        isFeatured: true,
      },
    })

    ids.push(item.id)
    expect(item.providerType).toBe('OPTOMETRIST')
    expect(item.category).toBe('eyewear')
    expect(item.unitOfMeasure).toBe('pair')
    expect(item.dosageForm).toBeNull()
    expect(item.strength).toBeNull()
    expect(item.isFeatured).toBe(true)
  })

  it('can create items for dentist (dental supplies)', async () => {
    const item = await prisma.providerInventoryItem.create({
      data: {
        providerUserId: 'dentist-test-user',
        providerType: 'DENTIST',
        name: 'Electric Toothbrush Pro',
        category: 'dental_care',
        price: 1800,
        quantity: 15,
        inStock: true,
      },
    })

    ids.push(item.id)
    expect(item.providerType).toBe('DENTIST')
    expect(item.requiresPrescription).toBe(false)
  })

  it('can create items for nanny (baby products)', async () => {
    const item = await prisma.providerInventoryItem.create({
      data: {
        providerUserId: 'nanny-test-user',
        providerType: 'NANNY',
        name: 'Baby Bottle Set',
        category: 'baby_care',
        description: 'Set of 3 anti-colic bottles',
        unitOfMeasure: 'unit',
        price: 450,
        quantity: 30,
        inStock: true,
      },
    })

    ids.push(item.id)
    expect(item.providerType).toBe('NANNY')
    expect(item.category).toBe('baby_care')
  })

  it('handles prescription-required medicines', async () => {
    const item = await prisma.providerInventoryItem.create({
      data: {
        providerUserId: 'pharm-test-user',
        providerType: 'PHARMACIST',
        name: 'Amoxicillin 500mg',
        category: 'medication',
        dosageForm: 'capsule',
        strength: '500mg',
        price: 350,
        quantity: 50,
        inStock: true,
        requiresPrescription: true,
        sideEffects: ['Nausea', 'Diarrhea', 'Allergic reaction'],
      },
    })

    ids.push(item.id)
    expect(item.requiresPrescription).toBe(true)
    expect(item.sideEffects).toHaveLength(3)
  })

  it('supports stock tracking fields', async () => {
    const item = await prisma.providerInventoryItem.create({
      data: {
        providerUserId: 'pharm-test-user',
        providerType: 'PHARMACIST',
        name: 'Low Stock Item',
        category: 'medication',
        price: 100,
        quantity: 3,
        minStockAlert: 5,
        inStock: true,
      },
    })

    ids.push(item.id)
    expect(item.quantity).toBe(3)
    expect(item.minStockAlert).toBe(5)
    // quantity (3) <= minStockAlert (5) — app logic would trigger alert
    expect(item.quantity <= item.minStockAlert).toBe(true)
  })
})

// ─── InventoryOrder + InventoryOrderItem ────────────────────────────────────

describe('InventoryOrder model', () => {
  let orderId: string
  let itemIds: string[] = []

  afterAll(async () => {
    await prisma.inventoryOrderItem.deleteMany({ where: { orderId } })
    await prisma.inventoryOrder.deleteMany({ where: { id: orderId } })
    await prisma.providerInventoryItem.deleteMany({ where: { id: { in: itemIds } } })
  })

  it('can create an order with line items', async () => {
    // Create inventory items first
    const item1 = await prisma.providerInventoryItem.create({
      data: {
        providerUserId: 'order-pharm',
        providerType: 'PHARMACIST',
        name: 'Paracetamol',
        category: 'medication',
        price: 80,
        quantity: 100,
      },
    })
    const item2 = await prisma.providerInventoryItem.create({
      data: {
        providerUserId: 'order-pharm',
        providerType: 'PHARMACIST',
        name: 'Bandages',
        category: 'first_aid',
        price: 120,
        quantity: 50,
      },
    })
    itemIds = [item1.id, item2.id]

    const order = await prisma.inventoryOrder.create({
      data: {
        patientUserId: 'patient-001',
        providerUserId: 'order-pharm',
        providerType: 'PHARMACIST',
        totalAmount: 280,
        deliveryType: 'delivery',
        deliveryAddress: '123 Main St, Port Louis',
        deliveryFee: 50,
        items: {
          create: [
            {
              inventoryItemId: item1.id,
              quantity: 2,
              unitPrice: 80,
              totalPrice: 160,
            },
            {
              inventoryItemId: item2.id,
              quantity: 1,
              unitPrice: 120,
              totalPrice: 120,
            },
          ],
        },
      },
      include: { items: true },
    })

    orderId = order.id
    expect(order.status).toBe('pending')
    expect(order.totalAmount).toBe(280)
    expect(order.deliveryType).toBe('delivery')
    expect(order.deliveryFee).toBe(50)
    expect(order.items).toHaveLength(2)
    expect(order.confirmedAt).toBeNull()
    expect(order.deliveredAt).toBeNull()
  })

  it('can update order status through the workflow', async () => {
    const statuses = ['confirmed', 'preparing', 'ready_for_delivery', 'delivery_in_progress', 'delivered', 'completed']

    for (const status of statuses) {
      const updated = await prisma.inventoryOrder.update({
        where: { id: orderId },
        data: { status },
      })
      expect(updated.status).toBe(status)
    }
  })

  it('can mark order as cancelled with timestamp', async () => {
    const cancelled = await prisma.inventoryOrder.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    })

    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.cancelledAt).not.toBeNull()
  })
})

// ─── Existing Models Unchanged ──────────────────────────────────────────────

describe('Existing models unchanged', () => {
  it('Appointment model still works with String status', async () => {
    const appointment = await prisma.appointment.findFirst({
      select: { id: true, status: true },
    })

    if (appointment) {
      expect(typeof appointment.status).toBe('string')
      expect(['pending', 'upcoming', 'confirmed', 'completed', 'cancelled']).toContain(appointment.status)
    }
  })

  it('NurseBooking model still works', async () => {
    const booking = await prisma.nurseBooking.findFirst({
      select: { id: true, status: true },
    })

    if (booking) {
      expect(typeof booking.status).toBe('string')
    }
  })

  it('EmergencyBooking uses String status (not enum)', async () => {
    const booking = await prisma.emergencyBooking.findFirst({
      select: { id: true, status: true },
    })

    if (booking) {
      expect(typeof booking.status).toBe('string')
    }
  })

  it('ServiceBooking model still works', async () => {
    const booking = await prisma.serviceBooking.findFirst({
      select: { id: true, status: true },
    })

    if (booking) {
      expect(typeof booking.status).toBe('string')
    }
  })

  it('PharmacyMedicine model still works (backward compat)', async () => {
    const medicine = await prisma.pharmacyMedicine.findFirst({
      select: { id: true, name: true, quantity: true, requiresPrescription: true },
    })

    if (medicine) {
      expect(typeof medicine.name).toBe('string')
      expect(typeof medicine.quantity).toBe('number')
    }
  })

  it('PlatformService has workflowTemplates relation', async () => {
    const service = await prisma.platformService.findFirst({
      include: { workflowTemplates: true },
    })

    if (service) {
      expect(Array.isArray(service.workflowTemplates)).toBe(true)
    }
  })

  it('Notification model still works', async () => {
    const notif = await prisma.notification.findFirst({
      select: { id: true, type: true, referenceId: true, referenceType: true },
    })

    if (notif) {
      expect(typeof notif.type).toBe('string')
    }
  })
})

// ─── Cascade Deletes ────────────────────────────────────────────────────────

describe('Cascade delete behavior', () => {
  it('deleting a WorkflowTemplate cascades to instances and step logs', async () => {
    const template = await prisma.workflowTemplate.create({
      data: {
        name: 'Cascade Test',
        slug: 'cascade-test-' + Date.now(),
        providerType: 'NURSE',
        serviceMode: 'home',
        steps: [],
        transitions: [],
      },
    })

    const instance = await prisma.workflowInstance.create({
      data: {
        templateId: template.id,
        bookingId: 'cascade-booking',
        bookingType: 'nurse_booking',
        currentStatus: 'pending',
        patientUserId: 'p-cascade',
        providerUserId: 'pr-cascade',
        serviceMode: 'home',
      },
    })

    await prisma.workflowStepLog.create({
      data: {
        instanceId: instance.id,
        toStatus: 'pending',
        action: 'create',
        actionByUserId: 'p-cascade',
        actionByRole: 'patient',
        label: 'Created',
      },
    })

    // Delete template — should cascade
    await prisma.workflowTemplate.delete({ where: { id: template.id } })

    // Verify cascade
    const deletedInstance = await prisma.workflowInstance.findUnique({ where: { id: instance.id } })
    expect(deletedInstance).toBeNull()

    const deletedLogs = await prisma.workflowStepLog.findMany({ where: { instanceId: instance.id } })
    expect(deletedLogs).toHaveLength(0)
  })

  it('deleting an InventoryOrder cascades to order items', async () => {
    const item = await prisma.providerInventoryItem.create({
      data: {
        providerUserId: 'cascade-prov',
        providerType: 'PHARMACIST',
        name: 'Cascade Item',
        category: 'medication',
        price: 100,
        quantity: 10,
      },
    })

    const order = await prisma.inventoryOrder.create({
      data: {
        patientUserId: 'cascade-pat',
        providerUserId: 'cascade-prov',
        providerType: 'PHARMACIST',
        totalAmount: 100,
        items: {
          create: [{ inventoryItemId: item.id, quantity: 1, unitPrice: 100, totalPrice: 100 }],
        },
      },
    })

    await prisma.inventoryOrder.delete({ where: { id: order.id } })

    const deletedItems = await prisma.inventoryOrderItem.findMany({ where: { orderId: order.id } })
    expect(deletedItems).toHaveLength(0)

    // Cleanup inventory item
    await prisma.providerInventoryItem.delete({ where: { id: item.id } })
  })
})
