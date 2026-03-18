import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { rateLimitSearch } from '@/lib/rate-limit'

type ProviderType = 'doctor' | 'nurse' | 'nanny' | 'lab-test' | 'caregiver' | 'physiotherapist' | 'dentist' | 'optometrist' | 'nutritionist'

interface ResolvedProvider {
  userId: string    // User.id — used for ProviderAvailability lookup
  profileId: string // Profile table id — used for existing bookings lookup
}

/**
 * Resolves a providerId (which may be either a User ID or a Profile ID)
 * to both the userId and profileId needed by this endpoint.
 *
 * Search APIs return user.id, so booking pages typically pass User IDs.
 * We try Profile ID first, then fall back to looking up by userId.
 */
async function resolveProvider(providerId: string, providerType: ProviderType): Promise<ResolvedProvider | null> {
  // New provider types use User ID directly (ServiceBooking references user IDs)
  const newRoles: ProviderType[] = ['caregiver', 'physiotherapist', 'dentist', 'optometrist', 'nutritionist']
  if (newRoles.includes(providerType)) {
    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: providerId }, select: { id: true } })
    if (user) return { userId: user.id, profileId: user.id }
    return null
  }

  switch (providerType) {
    case 'doctor': {
      const byProfile = await prisma.doctorProfile.findUnique({ where: { id: providerId }, select: { id: true, userId: true } })
      if (byProfile) return { userId: byProfile.userId, profileId: byProfile.id }
      const byUser = await prisma.doctorProfile.findFirst({ where: { userId: providerId }, select: { id: true, userId: true } })
      if (byUser) return { userId: byUser.userId, profileId: byUser.id }
      return null
    }
    case 'nurse': {
      const byProfile = await prisma.nurseProfile.findUnique({ where: { id: providerId }, select: { id: true, userId: true } })
      if (byProfile) return { userId: byProfile.userId, profileId: byProfile.id }
      const byUser = await prisma.nurseProfile.findFirst({ where: { userId: providerId }, select: { id: true, userId: true } })
      if (byUser) return { userId: byUser.userId, profileId: byUser.id }
      return null
    }
    case 'nanny': {
      const byProfile = await prisma.nannyProfile.findUnique({ where: { id: providerId }, select: { id: true, userId: true } })
      if (byProfile) return { userId: byProfile.userId, profileId: byProfile.id }
      const byUser = await prisma.nannyProfile.findFirst({ where: { userId: providerId }, select: { id: true, userId: true } })
      if (byUser) return { userId: byUser.userId, profileId: byUser.id }
      return null
    }
    case 'lab-test': {
      const byProfile = await prisma.labTechProfile.findUnique({ where: { id: providerId }, select: { id: true, userId: true } })
      if (byProfile) return { userId: byProfile.userId, profileId: byProfile.id }
      const byUser = await prisma.labTechProfile.findFirst({ where: { userId: providerId }, select: { id: true, userId: true } })
      if (byUser) return { userId: byUser.userId, profileId: byUser.id }
      return null
    }
    default:
      return null
  }
}

function generateSlots(startTime: string, endTime: string, slotDuration: number = 60): string[] {
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  const slots: string[] = []
  for (let m = startMinutes; m + slotDuration <= endMinutes; m += slotDuration) {
    const h = Math.floor(m / 60)
    const min = m % 60
    slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`)
  }

  return slots
}

async function getExistingBookings(providerId: string, providerType: ProviderType, dayStart: Date, dayEnd: Date) {
  // New roles use ServiceBooking table with providerUserId
  const newRoles: ProviderType[] = ['caregiver', 'physiotherapist', 'dentist', 'optometrist', 'nutritionist']
  if (newRoles.includes(providerType)) {
    return prisma.serviceBooking.findMany({
      where: {
        providerUserId: providerId,
        scheduledAt: { gte: dayStart, lt: dayEnd },
        status: { notIn: ['cancelled'] },
      },
      select: { scheduledAt: true },
    })
  }

  switch (providerType) {
    case 'doctor':
      return prisma.appointment.findMany({
        where: {
          doctorId: providerId,
          scheduledAt: { gte: dayStart, lt: dayEnd },
          status: { not: 'cancelled' },
        },
        select: { scheduledAt: true },
      })
    case 'nurse':
      return prisma.nurseBooking.findMany({
        where: {
          nurseId: providerId,
          scheduledAt: { gte: dayStart, lt: dayEnd },
          status: { not: 'cancelled' },
        },
        select: { scheduledAt: true },
      })
    case 'nanny':
      return prisma.childcareBooking.findMany({
        where: {
          nannyId: providerId,
          scheduledAt: { gte: dayStart, lt: dayEnd },
          status: { not: 'cancelled' },
        },
        select: { scheduledAt: true },
      })
    case 'lab-test':
      return prisma.labTestBooking.findMany({
        where: {
          labTechId: providerId,
          scheduledAt: { gte: dayStart, lt: dayEnd },
          status: { not: 'cancelled' },
        },
        select: { scheduledAt: true },
      })
  }
}

export async function GET(request: NextRequest) {
  const limited = rateLimitSearch(request)
  if (limited) return limited

  try {
    const { searchParams } = request.nextUrl
    const providerId = searchParams.get('providerId')
    const date = searchParams.get('date')
    const providerType = searchParams.get('providerType') as ProviderType | null

    if (!providerId || !date || !providerType) {
      return NextResponse.json(
        { success: false, message: 'Missing required query parameters: providerId, date, providerType' },
        { status: 400 }
      )
    }

    const validProviderTypes: ProviderType[] = ['doctor', 'nurse', 'nanny', 'lab-test', 'caregiver', 'physiotherapist', 'dentist', 'optometrist', 'nutritionist']
    if (!validProviderTypes.includes(providerType)) {
      return NextResponse.json(
        { success: false, message: `Invalid providerType. Must be one of: ${validProviderTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Resolve the providerId to both userId and profileId
    const provider = await resolveProvider(providerId, providerType)
    if (!provider) {
      return NextResponse.json(
        { success: false, message: 'Provider not found' },
        { status: 404 }
      )
    }

    // Calculate day of week from the date (0=Sunday, 6=Saturday)
    const dayOfWeek = new Date(date + 'T00:00:00').getDay()

    // Fetch availability for that userId and dayOfWeek where isActive=true
    const availability = await prisma.providerAvailability.findMany({
      where: {
        userId: provider.userId,
        dayOfWeek,
        isActive: true,
      },
      orderBy: { startTime: 'asc' },
    })

    // For doctors, fall back to ScheduleSlot if no ProviderAvailability is configured
    let scheduleSlots: { startTime: string; endTime: string; slotDuration: number }[] =
      availability.map(a => ({ startTime: a.startTime, endTime: a.endTime, slotDuration: a.slotDuration }))

    if (scheduleSlots.length === 0 && providerType === 'doctor') {
      const doctorSlots = await prisma.scheduleSlot.findMany({
        where: {
          doctorId: provider.profileId,
          dayOfWeek,
          isActive: true,
        },
        orderBy: { startTime: 'asc' },
      })
      scheduleSlots = doctorSlots.map(s => ({
        startTime: s.startTime,
        endTime: s.endTime,
        slotDuration: 30,
      }))
    }

    if (scheduleSlots.length === 0) {
      return NextResponse.json({ success: true, slots: [] })
    }

    // Generate slot start times within each availability window using configured duration
    const allSlots: string[] = []
    for (const window of scheduleSlots) {
      const slots = generateSlots(window.startTime, window.endTime, window.slotDuration)
      allSlots.push(...slots)
    }

    // Fetch existing bookings using the profile ID (booking tables reference profile IDs)
    const dayStart = new Date(date + 'T00:00:00')
    const dayEnd = new Date(date + 'T23:59:59')

    const bookings = await getExistingBookings(provider.profileId, providerType, dayStart, dayEnd) ?? []

    // Extract booked hours from existing bookings (use local time to match slot strings)
    const bookedHours = bookings.map(b => {
      const d = new Date(b.scheduledAt)
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    })

    // Filter out already-booked slots
    const availableSlots = allSlots.filter(slot => !bookedHours.includes(slot))

    return NextResponse.json({ success: true, slots: availableSlots, bookedSlots: bookedHours })
  } catch (error) {
    console.error('Error fetching available slots:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
