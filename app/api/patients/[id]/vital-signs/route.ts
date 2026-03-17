import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import prisma from '@/lib/db'
import { parsePagination } from '@/lib/api-utils'
import { z } from 'zod'
import { rateLimitPublic } from '@/lib/rate-limit'

const createVitalSignsSchema = z.object({
  systolicBP: z.number().int().min(50).max(300).optional(),
  diastolicBP: z.number().int().min(20).max(200).optional(),
  heartRate: z.number().int().min(20).max(300).optional(),
  temperature: z.number().min(30).max(45).optional(),
  weight: z.number().min(1).max(500).optional(),
  height: z.number().min(30).max(300).optional(),
  oxygenSaturation: z.number().int().min(0).max(100).optional(),
  glucose: z.number().int().min(0).max(1000).optional(),
  cholesterol: z.number().int().min(0).max(1000).optional(),
  facility: z.string().max(200).optional(),
  recordedBy: z.string().max(200).optional(),
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
  const latest = searchParams.get('latest') === 'true'
  const { limit } = parsePagination(searchParams)

  try {
    const profile = await prisma.patientProfile.findUnique({ where: { userId: id } })
    if (!profile) {
      return NextResponse.json({ success: false, message: 'Patient profile not found' }, { status: 404 })
    }

    const vitals = await prisma.vitalSigns.findMany({
      where: { patientId: profile.id },
      orderBy: { recordedAt: 'desc' },
      take: latest ? 1 : limit,
    })

    return NextResponse.json({ success: true, data: latest ? vitals[0] || null : vitals })
  } catch (error) {
    console.error('Vital signs fetch error:', error)
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
  // Patients can add their own, doctors/nurses can add for any patient
  if (auth.userType === 'patient' && auth.sub !== id) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = createVitalSignsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 })
    }

    const profile = await prisma.patientProfile.findUnique({ where: { userId: id }, select: { id: true } })
    if (!profile) {
      return NextResponse.json({ success: false, message: 'Patient profile not found' }, { status: 404 })
    }

    const vital = await prisma.vitalSigns.create({
      data: {
        patientId: profile.id,
        ...parsed.data,
      },
      select: {
        id: true, recordedAt: true, systolicBP: true, diastolicBP: true,
        heartRate: true, temperature: true, weight: true, height: true,
        oxygenSaturation: true, glucose: true, cholesterol: true,
        facility: true, recordedBy: true,
      },
    })

    return NextResponse.json({ success: true, data: vital }, { status: 201 })
  } catch (error) {
    console.error('POST /api/patients/[id]/vital-signs error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
