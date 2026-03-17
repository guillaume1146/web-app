import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { updateAvailabilitySchema } from '@/lib/validations/api'
import { rateLimitPublic } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  if (auth.sub !== id) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const dayOfWeekParam = searchParams.get('dayOfWeek')

    const where: { userId: string; dayOfWeek?: number } = { userId: id }
    if (dayOfWeekParam !== null) {
      const dayOfWeek = parseInt(dayOfWeekParam, 10)
      if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return NextResponse.json({ success: false, message: 'dayOfWeek must be 0-6' }, { status: 400 })
      }
      where.dayOfWeek = dayOfWeek
    }

    const slots = await prisma.providerAvailability.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: slots })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch availability' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const { id } = await params

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  if (auth.sub !== id) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = updateAvailabilitySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }
    const { slots } = parsed.data

    // Transaction: delete all existing, create all new
    const newSlots = await prisma.$transaction(async (tx) => {
      await tx.providerAvailability.deleteMany({ where: { userId: id } })

      if (slots.length === 0) return []

      await tx.providerAvailability.createMany({
        data: slots.map((slot) => ({
          userId: id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: slot.isActive ?? true,
        })),
      })

      return tx.providerAvailability.findMany({
        where: { userId: id },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    })

    return NextResponse.json({ success: true, data: newSlots })
  } catch (error) {
    console.error('Error updating availability:', error)
    return NextResponse.json({ success: false, message: 'Failed to update availability' }, { status: 500 })
  }
}
