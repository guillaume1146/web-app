import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitPublic } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const userId = auth.sub

  try {
    // Get user profile info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, userType: true, firstName: true, lastName: true }
    })
    if (!user) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })

    // Collect video rooms from multiple sources
    // Any user can book services (ensurePatientProfile creates a PatientProfile for them),
    // so we always check for a PatientProfile AND any role-specific provider profiles.
    interface RoomEntry {
      id: string
      scheduledAt: Date
      status: string
      reason: string | null
      roomId: string | null
      duration: number
      participantName: string
      participantImage: string | null
      participantProfileId?: string | null
      type: string
      endedAt?: Date | null
    }
    const appointments: RoomEntry[] = []

    // ── Patient-side bookings (ANY user who has booked a service) ──
    const patientProfile = await prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } })
    if (patientProfile) {
      // Doctor video consultations booked by this user
      const doctorApts = await prisma.appointment.findMany({
        where: { patientId: patientProfile.id, type: 'video', roomId: { not: null } },
        orderBy: { scheduledAt: 'desc' },
        select: {
          id: true, scheduledAt: true, status: true, reason: true, roomId: true, duration: true,
          doctor: { select: { user: { select: { firstName: true, lastName: true, profileImage: true } } } }
        }
      })
      appointments.push(...doctorApts.map(a => ({
        id: a.id,
        roomId: a.roomId,
        scheduledAt: a.scheduledAt,
        status: a.status,
        reason: a.reason,
        duration: a.duration,
        participantName: a.doctor?.user ? `Dr. ${a.doctor.user.firstName} ${a.doctor.user.lastName}` : 'Doctor',
        participantImage: a.doctor?.user?.profileImage || null,
        type: 'doctor_consultation',
      })))

      // Nurse video bookings booked by this user
      const nurseBookings = await prisma.nurseBooking.findMany({
        where: { patientId: patientProfile.id, type: 'video' },
        orderBy: { scheduledAt: 'desc' },
        select: {
          id: true, scheduledAt: true, status: true, reason: true, duration: true,
          nurse: { select: { user: { select: { firstName: true, lastName: true, profileImage: true } } } }
        }
      })
      appointments.push(...nurseBookings.map(b => ({
        id: b.id,
        roomId: `nurse-${b.id}`,
        scheduledAt: b.scheduledAt,
        status: b.status,
        reason: b.reason,
        duration: b.duration,
        participantName: b.nurse?.user ? `${b.nurse.user.firstName} ${b.nurse.user.lastName}` : 'Nurse',
        participantImage: b.nurse?.user?.profileImage || null,
        type: 'nurse_consultation',
      })))

      // Nanny video bookings booked by this user
      const nannyBookings = await prisma.childcareBooking.findMany({
        where: { patientId: patientProfile.id, type: 'video' },
        orderBy: { scheduledAt: 'desc' },
        select: {
          id: true, scheduledAt: true, status: true, reason: true, duration: true,
          nanny: { select: { user: { select: { firstName: true, lastName: true, profileImage: true } } } }
        }
      })
      appointments.push(...nannyBookings.map(b => ({
        id: b.id,
        roomId: `nanny-${b.id}`,
        scheduledAt: b.scheduledAt,
        status: b.status,
        reason: b.reason,
        duration: b.duration,
        participantName: b.nanny?.user ? `${b.nanny.user.firstName} ${b.nanny.user.lastName}` : 'Nanny',
        participantImage: b.nanny?.user?.profileImage || null,
        type: 'nanny_consultation',
      })))
    }

    // ── Provider-side bookings (incoming appointments from patients) ──
    if (user.userType === 'DOCTOR') {
      const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId }, select: { id: true } })
      if (doctorProfile) {
        const doctorApts = await prisma.appointment.findMany({
          where: { doctorId: doctorProfile.id, type: 'video', roomId: { not: null } },
          orderBy: { scheduledAt: 'desc' },
          select: {
            id: true, scheduledAt: true, status: true, reason: true, roomId: true, duration: true,
            patientId: true,
            patient: { select: { user: { select: { firstName: true, lastName: true, profileImage: true } } } }
          }
        })
        appointments.push(...doctorApts.map(a => ({
          id: a.id,
          roomId: a.roomId,
          scheduledAt: a.scheduledAt,
          status: a.status,
          reason: a.reason,
          duration: a.duration,
          participantName: a.patient?.user ? `${a.patient.user.firstName} ${a.patient.user.lastName}` : 'Patient',
          participantImage: a.patient?.user?.profileImage || null,
          participantProfileId: a.patientId,
          type: 'doctor_consultation',
        })))
      }
    } else if (user.userType === 'NURSE') {
      const nurseProfile = await prisma.nurseProfile.findUnique({ where: { userId }, select: { id: true } })
      if (nurseProfile) {
        const nurseBookings = await prisma.nurseBooking.findMany({
          where: { nurseId: nurseProfile.id, type: 'video' },
          orderBy: { scheduledAt: 'desc' },
          select: {
            id: true, scheduledAt: true, status: true, reason: true, duration: true,
            patient: { select: { user: { select: { firstName: true, lastName: true, profileImage: true } } } }
          }
        })
        appointments.push(...nurseBookings.map(b => ({
          id: b.id,
          roomId: `nurse-${b.id}`,
          scheduledAt: b.scheduledAt,
          status: b.status,
          reason: b.reason,
          duration: b.duration,
          participantName: b.patient?.user ? `${b.patient.user.firstName} ${b.patient.user.lastName}` : 'Patient',
          participantImage: b.patient?.user?.profileImage || null,
          type: 'nurse_consultation',
        })))
      }
    } else if (user.userType === 'NANNY') {
      const nannyProfile = await prisma.nannyProfile.findUnique({ where: { userId }, select: { id: true } })
      if (nannyProfile) {
        const nannyBookings = await prisma.childcareBooking.findMany({
          where: { nannyId: nannyProfile.id, type: 'video' },
          orderBy: { scheduledAt: 'desc' },
          select: {
            id: true, scheduledAt: true, status: true, reason: true, duration: true,
            patient: { select: { user: { select: { firstName: true, lastName: true, profileImage: true } } } }
          }
        })
        appointments.push(...nannyBookings.map(b => ({
          id: b.id,
          roomId: `nanny-${b.id}`,
          scheduledAt: b.scheduledAt,
          status: b.status,
          reason: b.reason,
          duration: b.duration,
          participantName: b.patient?.user ? `${b.patient.user.firstName} ${b.patient.user.lastName}` : 'Parent',
          participantImage: b.patient?.user?.profileImage || null,
          type: 'nanny_consultation',
        })))
      }
    }

    // Also get VideoRoom sessions the user has participated in
    const videoSessions = await prisma.videoCallSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 20,
      select: {
        id: true, startedAt: true, endedAt: true, status: true, duration: true,
        room: { select: { roomCode: true, creatorId: true, status: true } },
        connections: {
          where: { userId: { not: userId } },
          take: 1,
          select: { userName: true, userId: true },
        },
      }
    })

    // Resolve participant names for video sessions
    const otherUserIds = videoSessions
      .flatMap(s => {
        const ids: string[] = []
        if (s.connections.length > 0) ids.push(s.connections[0].userId)
        else if (s.room.creatorId !== userId) ids.push(s.room.creatorId)
        return ids
      })
      .filter(Boolean)

    const otherUsers = otherUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: otherUserIds } },
          select: { id: true, firstName: true, lastName: true, profileImage: true, userType: true },
        })
      : []
    const otherUserMap = new Map(otherUsers.map(u => [u.id, u]))

    // Sort all rooms by scheduledAt/startedAt descending
    const allRooms = [
      ...appointments,
      ...videoSessions.map(s => {
        let pName = 'Video Session'
        let pImage: string | null = null

        // Prefer the other participant's connection name
        if (s.connections.length > 0) {
          const otherUser = otherUserMap.get(s.connections[0].userId)
          if (otherUser) {
            const prefix = otherUser.userType === 'DOCTOR' ? 'Dr. ' : ''
            pName = `${prefix}${otherUser.firstName} ${otherUser.lastName}`
            pImage = otherUser.profileImage
          } else if (s.connections[0].userName) {
            pName = s.connections[0].userName
          }
        } else if (s.room.creatorId !== userId) {
          const creator = otherUserMap.get(s.room.creatorId)
          if (creator) {
            const prefix = creator.userType === 'DOCTOR' ? 'Dr. ' : ''
            pName = `${prefix}${creator.firstName} ${creator.lastName}`
            pImage = creator.profileImage
          }
        }

        return {
          id: s.id,
          roomId: s.room.roomCode,
          scheduledAt: s.startedAt,
          endedAt: s.endedAt,
          status: s.status === 'active' ? 'upcoming' : s.status,
          reason: 'Video Session',
          duration: s.duration,
          participantName: pName,
          participantImage: pImage,
          type: 'direct_session',
        }
      })
    ]

    // Deduplicate by roomId
    const seen = new Set<string>()
    const dedupedRooms = allRooms.filter(r => {
      if (!r.roomId || seen.has(r.roomId)) return false
      seen.add(r.roomId)
      return true
    })

    // Sort by date descending
    dedupedRooms.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

    return NextResponse.json({
      success: true,
      data: dedupedRooms,
    })
  } catch (error) {
    console.error('Video rooms list error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
