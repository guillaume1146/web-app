import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import prisma from '@/lib/db'
import { pharmacyMedicineSchema } from '@/lib/validations/catalog'
import { rateLimitPublic } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  if (auth.userType !== 'pharmacy') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const pharmacistProfile = await prisma.pharmacistProfile.findUnique({
      where: { userId: auth.sub },
      select: { id: true },
    })

    if (!pharmacistProfile) {
      return NextResponse.json({ success: false, message: 'Pharmacist profile not found' }, { status: 404 })
    }

    const medicine = await prisma.pharmacyMedicine.findUnique({
      where: { id },
    })

    if (!medicine) {
      return NextResponse.json({ success: false, message: 'Medicine not found' }, { status: 404 })
    }

    if (medicine.pharmacistId !== pharmacistProfile.id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: medicine })
  } catch (error) {
    console.error('Pharmacist medicine get error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  if (auth.userType !== 'pharmacy') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const pharmacistProfile = await prisma.pharmacistProfile.findUnique({
      where: { userId: auth.sub },
      select: { id: true },
    })

    if (!pharmacistProfile) {
      return NextResponse.json({ success: false, message: 'Pharmacist profile not found' }, { status: 404 })
    }

    const medicine = await prisma.pharmacyMedicine.findUnique({
      where: { id },
      select: { pharmacistId: true },
    })

    if (!medicine) {
      return NextResponse.json({ success: false, message: 'Medicine not found' }, { status: 404 })
    }

    if (medicine.pharmacistId !== pharmacistProfile.id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = pharmacyMedicineSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const updated = await prisma.pharmacyMedicine.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Pharmacist medicine update error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  if (auth.userType !== 'pharmacy') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const pharmacistProfile = await prisma.pharmacistProfile.findUnique({
      where: { userId: auth.sub },
      select: { id: true },
    })

    if (!pharmacistProfile) {
      return NextResponse.json({ success: false, message: 'Pharmacist profile not found' }, { status: 404 })
    }

    const medicine = await prisma.pharmacyMedicine.findUnique({
      where: { id },
      select: { pharmacistId: true },
    })

    if (!medicine) {
      return NextResponse.json({ success: false, message: 'Medicine not found' }, { status: 404 })
    }

    if (medicine.pharmacistId !== pharmacistProfile.id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    await prisma.pharmacyMedicine.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Medicine deleted' })
  } catch (error) {
    console.error('Pharmacist medicine delete error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
