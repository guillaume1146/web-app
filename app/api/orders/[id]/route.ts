import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { updateOrderStatusSchema } from '@/lib/validations/api'
import { rateLimitPublic } from '@/lib/rate-limit'

// ─── GET — Single order details ────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const order = await prisma.medicineOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        pharmacy: true,
        orderedAt: true,
        deliveredAt: true,
        createdAt: true,
        patient: {
          select: { userId: true },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            pharmacyMedicine: {
              select: {
                id: true,
                name: true,
                dosageForm: true,
                strength: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify the requesting user is the patient who placed the order
    if (order.patient.userId !== auth.sub) {
      // Also allow pharmacists and admins to view
      if (auth.userType !== 'pharmacy' && !['admin', 'regional-admin'].includes(auth.userType)) {
        return NextResponse.json(
          { success: false, message: 'Forbidden' },
          { status: 403 }
        )
      }
    }

    // Remove internal patient userId from response
    const { patient: _patient, ...orderData } = order

    return NextResponse.json({ success: true, data: orderData })
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH — Update order status ───────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const parsed = updateOrderStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { status } = parsed.data

    // Fetch the order with patient info and items
    const order = await prisma.medicineOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        patient: {
          select: { userId: true },
        },
        items: {
          select: {
            pharmacyMedicineId: true,
            quantity: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }

    // Authorization: pharmacist, admin, or the patient (for cancellation only)
    const isPatient = order.patient.userId === auth.sub
    const isPrivileged = auth.userType === 'pharmacy' || ['admin', 'regional-admin'].includes(auth.userType)

    if (!isPatient && !isPrivileged) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      )
    }

    // Patients can only cancel their own orders
    if (isPatient && !isPrivileged && status !== 'cancelled') {
      return NextResponse.json(
        { success: false, message: 'Patients can only cancel orders' },
        { status: 403 }
      )
    }

    // Prevent invalid status transitions
    if (order.status === 'cancelled') {
      return NextResponse.json(
        { success: false, message: 'Cannot update a cancelled order' },
        { status: 400 }
      )
    }

    if (order.status === 'delivered') {
      return NextResponse.json(
        { success: false, message: 'Cannot update a delivered order' },
        { status: 400 }
      )
    }

    // Handle cancellation: refund wallet and restore stock
    if (status === 'cancelled') {
      await prisma.$transaction(async (tx) => {
        // Update order status
        await tx.medicineOrder.update({
          where: { id },
          data: { status: 'cancelled' },
        })

        // Refund wallet
        const wallet = await tx.userWallet.findUnique({
          where: { userId: order.patient.userId },
          select: { id: true, balance: true },
        })

        if (wallet) {
          const newBalance = wallet.balance + order.totalAmount

          await tx.userWallet.update({
            where: { id: wallet.id },
            data: { balance: newBalance },
          })

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'credit',
              amount: order.totalAmount,
              description: `Refund for cancelled order ${id}`,
              serviceType: 'medicine',
              balanceBefore: wallet.balance,
              balanceAfter: newBalance,
            },
          })
        }

        // Restore stock for each item
        for (const item of order.items) {
          if (item.pharmacyMedicineId) {
            await tx.pharmacyMedicine.update({
              where: { id: item.pharmacyMedicineId },
              data: {
                quantity: { increment: item.quantity },
                inStock: true,
              },
            })
          }
        }
      })

      return NextResponse.json({
        success: true,
        data: { orderId: id, status: 'cancelled', refunded: true },
      })
    }

    // Handle non-cancellation status updates
    const updateData: { status: string; deliveredAt?: Date } = { status }
    if (status === 'delivered') {
      updateData.deliveredAt = new Date()
    }

    const updated = await prisma.medicineOrder.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        status: true,
        totalAmount: true,
        pharmacy: true,
        orderedAt: true,
        deliveredAt: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/orders/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
