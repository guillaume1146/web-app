import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import prisma from '@/lib/db'
import { parsePagination } from '@/lib/api-utils'
import { rateLimitPublic } from '@/lib/rate-limit'
import { z } from 'zod'

const createRecordSchema = z.object({
  title: z.string().min(1).max(500),
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  type: z.enum(['consultation', 'prescription', 'lab_result', 'imaging', 'vaccination', 'surgery', 'other']),
  summary: z.string().min(1).max(5000),
  diagnosis: z.string().max(2000).optional(),
  treatment: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  attachments: z.array(z.string()).optional(),
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
  const type = searchParams.get('type')
  const { limit, offset } = parsePagination(searchParams)

  try {
    const profile = await prisma.patientProfile.findUnique({ where: { userId: id } })
    if (!profile) {
      return NextResponse.json({ success: false, message: 'Patient profile not found' }, { status: 404 })
    }

    const where = { patientId: profile.id, ...(type ? { type } : {}) }

    const [records, total] = await Promise.all([
      prisma.medicalRecord.findMany({
        where,
        select: {
          id: true, title: true, date: true, type: true, summary: true,
          diagnosis: true, treatment: true, notes: true, attachments: true,
          doctor: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.medicalRecord.count({ where }),
    ])

    return NextResponse.json({ success: true, data: records, total, limit, offset })
  } catch (error) {
    console.error('Medical records fetch error:', error)
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

  const { id } = await params
  // Only doctors/nurses can add medical records for a patient
  const allowedTypes = ['doctor', 'nurse', 'lab', 'patient']
  if (!allowedTypes.includes(auth.userType)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }
  // Patients can only add to their own records
  if (auth.userType === 'patient' && auth.sub !== id) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = createRecordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 })
    }

    const profile = await prisma.patientProfile.findUnique({ where: { userId: id }, select: { id: true } })
    if (!profile) {
      return NextResponse.json({ success: false, message: 'Patient profile not found' }, { status: 404 })
    }

    // If the creator is a doctor, link the record to the doctor profile
    let doctorId: string | undefined
    if (auth.userType === 'doctor') {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: auth.sub },
        select: { id: true },
      })
      doctorId = doctorProfile?.id
    }

    const record = await prisma.medicalRecord.create({
      data: {
        patientId: profile.id,
        doctorId,
        title: parsed.data.title,
        date: new Date(parsed.data.date),
        type: parsed.data.type,
        summary: parsed.data.summary,
        diagnosis: parsed.data.diagnosis,
        treatment: parsed.data.treatment,
        notes: parsed.data.notes,
        attachments: parsed.data.attachments || [],
      },
      select: {
        id: true, title: true, date: true, type: true, summary: true,
        diagnosis: true, treatment: true, notes: true,
      },
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('POST /api/patients/[id]/medical-records error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
