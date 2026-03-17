import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitPublic } from '@/lib/rate-limit'

const educationSchema = z.object({
  degree: z.string().min(1, 'Degree is required'),
  institution: z.string().min(1, 'Institution is required'),
  year: z.number().int().min(1950).max(2030),
  honors: z.string().optional(),
})

const deleteSchema = z.object({
  educationId: z.string().uuid('Invalid education ID'),
})

/**
 * GET /api/doctors/[id]/education
 * List education entries for a doctor (public).
 * The `id` param is the doctor profile ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const { id } = await params

  try {
    const education = await prisma.doctorEducation.findMany({
      where: { doctorId: id },
      select: {
        id: true,
        degree: true,
        institution: true,
        year: true,
        honors: true,
      },
      orderBy: { year: 'desc' },
    })

    return NextResponse.json({ success: true, data: education })
  } catch (error) {
    console.error('Doctor education fetch error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

/**
 * POST /api/doctors/[id]/education
 * Add an education entry. Auth required + ownership check.
 * The `id` param is the doctor profile ID.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    // Verify ownership: the authenticated user must own this doctor profile
    const profile = await prisma.doctorProfile.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!profile || profile.userId !== auth.sub) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = educationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const education = await prisma.doctorEducation.create({
      data: {
        doctorId: id,
        degree: parsed.data.degree,
        institution: parsed.data.institution,
        year: parsed.data.year,
        honors: parsed.data.honors,
      },
      select: {
        id: true,
        degree: true,
        institution: true,
        year: true,
        honors: true,
      },
    })

    return NextResponse.json({ success: true, data: education }, { status: 201 })
  } catch (error) {
    console.error('Doctor education create error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/doctors/[id]/education
 * Delete an education entry. Auth required + ownership check.
 * The `id` param is the doctor profile ID.
 * Accepts `educationId` in the request body.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    // Verify ownership: the authenticated user must own this doctor profile
    const profile = await prisma.doctorProfile.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!profile || profile.userId !== auth.sub) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    // Verify the education entry belongs to this doctor profile
    const education = await prisma.doctorEducation.findUnique({
      where: { id: parsed.data.educationId },
      select: { doctorId: true },
    })

    if (!education || education.doctorId !== id) {
      return NextResponse.json({ success: false, message: 'Education entry not found' }, { status: 404 })
    }

    await prisma.doctorEducation.delete({
      where: { id: parsed.data.educationId },
    })

    return NextResponse.json({ success: true, data: { deleted: parsed.data.educationId } })
  } catch (error) {
    console.error('Doctor education delete error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
