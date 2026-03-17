import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitPublic } from '@/lib/rate-limit'
import { createOrderSchema } from '@/lib/validations/api'
import { ensurePatientProfile } from '@/lib/bookings/ensure-patient-profile'
import { getSubscriptionDiscount } from '@/lib/subscription/usage'

// ─── POST — Create a medicine order ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { items } = parsed.data

    // Find or auto-create patient profile (any user type can order medicine)
    const patientProfile = await ensurePatientProfile(auth.sub)

    // Execute the entire order flow inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Fetch all pharmacy medicines (include pharmacist userId for crediting)
      const medicines = await Promise.all(
        items.map((item) =>
          tx.pharmacyMedicine.findUnique({
            where: { id: item.pharmacyMedicineId },
            select: {
              id: true,
              name: true,
              price: true,
              quantity: true,
              inStock: true,
              isActive: true,
              requiresPrescription: true,
              pharmacist: { select: { pharmacyName: true, userId: true } },
            },
          })
        )
      )

      // Validate stock availability
      const unavailable: string[] = []
      for (let i = 0; i < items.length; i++) {
        const med = medicines[i]
        const item = items[i]
        if (!med || !med.isActive) {
          unavailable.push(`${item.pharmacyMedicineId}: medicine not found or inactive`)
        } else if (!med.inStock) {
          unavailable.push(`${med.name}: out of stock`)
        } else if (med.quantity < item.quantity) {
          unavailable.push(`${med.name}: only ${med.quantity} available, requested ${item.quantity}`)
        }
      }

      if (unavailable.length > 0) {
        throw { code: 'OUT_OF_STOCK', details: unavailable }
      }

      // Check prescription requirements
      const prescriptionRequired: string[] = []
      for (let i = 0; i < items.length; i++) {
        const med = medicines[i]
        if (med?.requiresPrescription) {
          prescriptionRequired.push(med.name)
        }
      }
      if (prescriptionRequired.length > 0) {
        // Check if patient has a valid prescription for these medicines
        const prescriptionMeds = await tx.prescriptionMedicine.findMany({
          where: {
            prescription: {
              patientId: patientProfile.id,
              isActive: true,
            },
            medicine: { name: { in: prescriptionRequired } },
          },
          select: { medicine: { select: { name: true } } },
        })
        const coveredMedicines = new Set(prescriptionMeds.map((pm: { medicine: { name: string } }) => pm.medicine.name))
        const uncovered = prescriptionRequired.filter(name => !coveredMedicines.has(name))
        if (uncovered.length > 0) {
          throw { code: 'PRESCRIPTION_REQUIRED', details: uncovered }
        }
      }

      // Check subscription pharmacy discount
      const pharmacyDiscount = await getSubscriptionDiscount(auth.sub, 'pharmacy')
      const discountPercent = pharmacyDiscount.discountPercent

      // Calculate total with subscription discount applied
      const total = items.reduce((sum, item, i) => {
        const basePrice = medicines[i]!.price * item.quantity
        const discount = discountPercent > 0 ? Math.round(basePrice * discountPercent / 100) : 0
        return sum + (basePrice - discount)
      }, 0)

      // Check wallet balance
      const wallet = await tx.userWallet.findUnique({
        where: { userId: auth.sub },
        select: { id: true, balance: true },
      })

      if (!wallet || wallet.balance < total) {
        throw {
          code: 'INSUFFICIENT_BALANCE',
          required: total,
          available: wallet?.balance ?? 0,
        }
      }

      // Deduct wallet balance
      await tx.userWallet.update({
        where: { id: wallet.id },
        data: { balance: wallet.balance - total },
      })

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'debit',
          amount: total,
          description: `Medicine order: ${items.length} item(s)${discountPercent > 0 ? ` (${discountPercent}% pharmacy discount)` : ''}`,
          serviceType: 'medicine',
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance - total,
        },
      })

      // Find or create Medicine records for each pharmacy medicine
      const medicineRecords = await Promise.all(
        medicines.map(async (med) => {
          if (!med) throw { code: 'INVALID_MEDICINE' }
          return tx.medicine.upsert({
            where: { name: med.name },
            update: {},
            create: { name: med.name, category: 'General' },
          })
        })
      )

      // Create the order with items
      const order = await tx.medicineOrder.create({
        data: {
          patientId: patientProfile.id,
          status: 'confirmed',
          totalAmount: total,
          pharmacy: medicines[0]!.pharmacist.pharmacyName,
          items: {
            create: items.map((item, i) => ({
              medicineId: medicineRecords[i].id,
              pharmacyMedicineId: item.pharmacyMedicineId,
              quantity: item.quantity,
              price: medicines[i]!.price,
            })),
          },
        },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          pharmacy: true,
          orderedAt: true,
        },
      })

      // Decrement stock for each item
      await Promise.all(
        items.map((item, i) =>
          tx.pharmacyMedicine.update({
            where: { id: item.pharmacyMedicineId },
            data: {
              quantity: { decrement: item.quantity },
              inStock: medicines[i]!.quantity - item.quantity > 0,
            },
          })
        )
      )

      // Credit pharmacist wallets — group items by pharmacist
      const pharmacistTotals = new Map<string, number>()
      for (let i = 0; i < items.length; i++) {
        const pharmacistUserId = medicines[i]!.pharmacist.userId
        const subtotal = medicines[i]!.price * items[i].quantity
        pharmacistTotals.set(
          pharmacistUserId,
          (pharmacistTotals.get(pharmacistUserId) ?? 0) + subtotal
        )
      }

      for (const [pharmacistUserId, amount] of pharmacistTotals) {
        const pharmacistWallet = await tx.userWallet.findUnique({
          where: { userId: pharmacistUserId },
          select: { id: true, balance: true },
        })
        if (pharmacistWallet) {
          await tx.userWallet.update({
            where: { id: pharmacistWallet.id },
            data: { balance: pharmacistWallet.balance + amount },
          })
          await tx.walletTransaction.create({
            data: {
              walletId: pharmacistWallet.id,
              type: 'credit',
              amount,
              description: `Medicine sale — Order #${order.id.slice(0, 8)}`,
              serviceType: 'medicine',
              referenceId: order.id,
              balanceBefore: pharmacistWallet.balance,
              balanceAfter: pharmacistWallet.balance + amount,
              status: 'completed',
            },
          })
        }
      }

      return {
        orderId: order.id,
        status: order.status,
        totalAmount: total,
        walletBalance: wallet.balance - total,
        items: items.map((item, i) => ({
          pharmacyMedicineId: item.pharmacyMedicineId,
          name: medicines[i]!.name,
          quantity: item.quantity,
          price: medicines[i]!.price,
          subtotal: medicines[i]!.price * item.quantity,
        })),
      }
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error: unknown) {
    // Handle known business errors thrown from the transaction
    if (error && typeof error === 'object' && 'code' in error) {
      const err = error as { code: string; details?: string[]; required?: number; available?: number }

      if (err.code === 'OUT_OF_STOCK') {
        return NextResponse.json(
          { success: false, message: 'Some items are unavailable', details: err.details },
          { status: 400 }
        )
      }

      if (err.code === 'INSUFFICIENT_BALANCE') {
        return NextResponse.json(
          {
            success: false,
            message: 'Insufficient wallet balance',
            required: err.required,
            available: err.available,
          },
          { status: 400 }
        )
      }

      if (err.code === 'PRESCRIPTION_REQUIRED') {
        return NextResponse.json(
          {
            success: false,
            message: 'Prescription required for some medicines',
            details: err.details,
          },
          { status: 400 }
        )
      }

      if (err.code === 'INVALID_MEDICINE') {
        return NextResponse.json(
          { success: false, message: 'Invalid medicine reference' },
          { status: 400 }
        )
      }
    }

    console.error('POST /api/orders error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET — List patient's orders ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))

    const [orders, totalCount] = await Promise.all([
      prisma.medicineOrder.findMany({
        where: { patient: { userId: auth.sub } },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          pharmacy: true,
          orderedAt: true,
          deliveredAt: true,
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              pharmacyMedicine: {
                select: { name: true, dosageForm: true, strength: true },
              },
            },
          },
        },
        orderBy: { orderedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.medicineOrder.count({
        where: { patient: { userId: auth.sub } },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('GET /api/orders error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
