import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import prisma from '@/lib/db'
import { parsePagination } from '@/lib/api-utils'
import { rateLimitPublic } from '@/lib/rate-limit'
import { z } from 'zod'
import { createNotification } from '@/lib/notifications'

const createPrescriptionSchema = z.object({
  diagnosis: z.string().min(1).max(2000),
  notes: z.string().max(5000).optional(),
  nextRefill: z.string().datetime().optional(),
  medicines: z.array(z.object({
    medicineId: z.string().min(1),
    dosage: z.string().min(1).max(200),
    frequency: z.string().min(1).max(200),
    duration: z.string().min(1).max(200),
    instructions: z.string().max(500).optional(),
  })).min(1, 'At least one medicine is required'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (auth.userType === 'patient' && auth.sub !== id) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const active = searchParams.get('active') // 'true' or 'false'
  const { limit, offset } = parsePagination(searchParams)

  try {
    const profile = await prisma.patientProfile.findUnique({ where: { userId: id } })
    if (!profile) {
      return NextResponse.json({ success: false, message: 'Patient profile not found' }, { status: 404 })
    }

    const where = {
      patientId: profile.id,
      ...(active !== null ? { isActive: active === 'true' } : {}),
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        select: {
          id: true, date: true, diagnosis: true, isActive: true, nextRefill: true, notes: true,
          doctor: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
          medicines: {
            select: {
              dosage: true, frequency: true, duration: true, instructions: true,
              medicine: { select: { id: true, name: true, category: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.prescription.count({ where }),
    ])

    return NextResponse.json({ success: true, data: prescriptions, total, limit, offset })
  } catch (error) {
    console.error('Prescriptions fetch error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  // Only doctors can create prescriptions
  if (auth.userType !== 'doctor') {
    return NextResponse.json({ success: false, message: 'Only doctors can create prescriptions' }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const parsed = createPrescriptionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 })
    }

    const patientProfile = await prisma.patientProfile.findUnique({ where: { userId: id }, select: { id: true, userId: true } })
    if (!patientProfile) {
      return NextResponse.json({ success: false, message: 'Patient not found' }, { status: 404 })
    }

    const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId: auth.sub }, select: { id: true } })
    if (!doctorProfile) {
      return NextResponse.json({ success: false, message: 'Doctor profile not found' }, { status: 404 })
    }

    const prescription = await prisma.prescription.create({
      data: {
        patientId: patientProfile.id,
        doctorId: doctorProfile.id,
        diagnosis: parsed.data.diagnosis,
        notes: parsed.data.notes,
        nextRefill: parsed.data.nextRefill ? new Date(parsed.data.nextRefill) : undefined,
        medicines: {
          create: parsed.data.medicines.map(m => ({
            medicineId: m.medicineId,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
            instructions: m.instructions,
          })),
        },
      },
      select: {
        id: true, date: true, diagnosis: true, isActive: true, notes: true,
        medicines: {
          select: {
            dosage: true, frequency: true, duration: true, instructions: true,
            medicine: { select: { id: true, name: true } },
          },
        },
      },
    })

    await createNotification({
      userId: patientProfile.userId,
      type: 'prescription_created',
      title: 'New Prescription',
      message: `Your doctor has created a new prescription for: ${parsed.data.diagnosis}`,
      referenceId: prescription.id,
      referenceType: 'prescription',
    })

    return NextResponse.json({ success: true, data: prescription }, { status: 201 })
  } catch (error) {
    console.error('POST /api/patients/[id]/prescriptions error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
