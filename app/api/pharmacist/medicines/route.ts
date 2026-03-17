import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import prisma from '@/lib/db'
import { pharmacyMedicineSchema } from '@/lib/validations/catalog'
import { rateLimitPublic } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  if (auth.userType !== 'pharmacy') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const pharmacistProfile = await prisma.pharmacistProfile.findUnique({
      where: { userId: auth.sub },
      select: { id: true },
    })

    if (!pharmacistProfile) {
      return NextResponse.json({ success: false, message: 'Pharmacist profile not found' }, { status: 404 })
    }

    const medicines = await prisma.pharmacyMedicine.findMany({
      where: { pharmacistId: pharmacistProfile.id },
      include: {
        pharmacist: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: medicines })
  } catch (error) {
    console.error('Pharmacist medicines fetch error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  if (auth.userType !== 'pharmacy') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const pharmacistProfile = await prisma.pharmacistProfile.findUnique({
      where: { userId: auth.sub },
      select: { id: true },
    })

    if (!pharmacistProfile) {
      return NextResponse.json({ success: false, message: 'Pharmacist profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = pharmacyMedicineSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const medicine = await prisma.pharmacyMedicine.create({
      data: {
        pharmacistId: pharmacistProfile.id,
        ...parsed.data,
      },
    })

    return NextResponse.json({ success: true, data: medicine }, { status: 201 })
  } catch (error) {
    console.error('Pharmacist medicine create error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
