import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'

/**
 * POST /api/programs/[id]/enroll
 * Patient enrolls in a health program.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const auth = await validateRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const program = await prisma.healthProgram.findUnique({
      where: { id },
      select: { id: true, name: true, maxParticipants: true, isActive: true, sessions: { select: { id: true } }, _count: { select: { enrollments: true } } },
    })

    if (!program || !program.isActive) {
      return NextResponse.json({ success: false, message: 'Program not found or inactive' }, { status: 404 })
    }

    if (program.maxParticipants && program._count.enrollments >= program.maxParticipants) {
      return NextResponse.json({ success: false, message: 'Program is full' }, { status: 400 })
    }

    // Check if already enrolled
    const existing = await prisma.programEnrollment.findUnique({
      where: { programId_patientId: { programId: id, patientId: auth.sub } },
    })
    if (existing) {
      return NextResponse.json({ success: false, message: 'Already enrolled in this program' }, { status: 409 })
    }

    // Enroll + create session progress entries
    const enrollment = await prisma.$transaction(async (tx) => {
      const newEnrollment = await tx.programEnrollment.create({
        data: { programId: id, patientId: auth.sub, status: 'enrolled' },
      })

      if (program.sessions.length > 0) {
        await tx.programSessionProgress.createMany({
          data: program.sessions.map(s => ({
            enrollmentId: newEnrollment.id,
            sessionId: s.id,
            status: 'pending',
          })),
        })
      }

      return newEnrollment
    })

    return NextResponse.json({
      success: true,
      data: enrollment,
      message: `Enrolled in ${program.name}`,
    })
  } catch (error) {
    console.error('POST /api/programs/[id]/enroll error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
