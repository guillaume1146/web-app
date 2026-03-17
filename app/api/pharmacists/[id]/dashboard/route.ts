import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitPublic } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (auth.sub !== id) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })

  try {
    const pharmacistProfile = await prisma.pharmacistProfile.findUnique({
      where: { userId: id },
      select: { id: true, pharmacyName: true }
    })
    if (!pharmacistProfile) return NextResponse.json({ success: false, message: 'Pharmacist profile not found' }, { status: 404 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    // Get medicines by this pharmacist to find orders containing them
    const pharmacyMedicines = await prisma.pharmacyMedicine.findMany({
      where: { pharmacistId: pharmacistProfile.id },
      select: { id: true }
    })
    const pharmacyMedicineIds = pharmacyMedicines.map(m => m.id)

    const [pendingOrders, recentOrders, todayOrders, monthOrders, wallet] = await Promise.all([
      prisma.medicineOrder.count({
        where: { status: 'pending', items: { some: { pharmacyMedicineId: { in: pharmacyMedicineIds } } } }
      }),
      prisma.medicineOrder.findMany({
        where: { items: { some: { pharmacyMedicineId: { in: pharmacyMedicineIds } } } },
        orderBy: { orderedAt: 'desc' },
        take: 5,
        select: {
          id: true, status: true, totalAmount: true, orderedAt: true,
          patient: { select: { user: { select: { firstName: true, lastName: true } } } },
          items: { select: { quantity: true, price: true, medicine: { select: { name: true } } } }
        }
      }),
      prisma.medicineOrder.findMany({
        where: {
          items: { some: { pharmacyMedicineId: { in: pharmacyMedicineIds } } },
          orderedAt: { gte: today, lt: tomorrow }
        },
        select: { totalAmount: true }
      }),
      prisma.medicineOrder.findMany({
        where: {
          items: { some: { pharmacyMedicineId: { in: pharmacyMedicineIds } } },
          orderedAt: { gte: firstOfMonth }
        },
        select: { totalAmount: true }
      }),
      prisma.userWallet.findUnique({ where: { userId: id }, select: { balance: true } })
    ])

    const dailyRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    const monthlyRevenue = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0)

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          dailyRevenue,
          pendingOrders,
          monthlyRevenue,
          walletBalance: wallet?.balance || 0,
        },
        recentOrders: recentOrders.map((o, idx) => ({
          id: o.id,
          orderNumber: `#ORD-${o.id.slice(0, 4).toUpperCase()}`,
          customerName: o.patient?.user ? `${o.patient.user.firstName} ${o.patient.user.lastName}` : 'Customer',
          itemCount: o.items.length,
          total: o.totalAmount,
          status: o.status,
          orderedAt: o.orderedAt,
        })),
      }
    })
  } catch (error) {
    console.error('Pharmacist dashboard error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
