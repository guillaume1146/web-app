import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth, rateLimitPublic } from '@/lib/rate-limit'
import { z } from 'zod'

const createProgramSchema = z.object({
  name: z.string().min(1, 'Program name is required').max(200),
  description: z.string().min(1).max(2000),
  providerType: z.string().min(1),
  specialty: z.string().optional(),
  durationWeeks: z.number().int().min(1).max(52),
  price: z.number().min(0),
  maxParticipants: z.number().int().min(1).optional(),
  sessions: z.array(z.object({
    weekNumber: z.number().int().min(1),
    serviceName: z.string().min(1),
    description: z.string().optional(),
    duration: z.number().int().min(15).optional(),
  })).min(1, 'At least one session is required'),
})

/**
 * GET /api/programs
 * List active programs. Filter by providerType, countryCode.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  try {
    const { searchParams } = new URL(request.url)
    const providerType = searchParams.get('providerType')
    const countryCode = searchParams.get('countryCode')

    const where: Record<string, unknown> = { isActive: true }
    if (providerType) where.providerType = providerType
    if (countryCode) where.OR = [{ countryCode }, { countryCode: null }]

    const programs = await prisma.healthProgram.findMany({
      where,
      include: {
        sessions: { orderBy: { weekNumber: 'asc' } },
        providers: { select: { userId: true, role: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: programs })
  } catch (error) {
    console.error('GET /api/programs error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/programs
 * Provider creates a new health program.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const auth = await validateRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createProgramSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 })
    }

    const data = parsed.data

    // Get user's region
    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: { regionId: true },
    })
    let countryCode: string | null = null
    if (user?.regionId) {
      const region = await prisma.region.findUnique({
        where: { id: user.regionId },
        select: { countryCode: true },
      })
      countryCode = region?.countryCode ?? null
    }

    const program = await prisma.$transaction(async (tx) => {
      const newProgram = await tx.healthProgram.create({
        data: {
          name: data.name,
          description: data.description,
          providerType: data.providerType as never,
          specialty: data.specialty ?? null,
          durationWeeks: data.durationWeeks,
          price: data.price,
          countryCode,
          createdByUserId: auth.sub,
        },
      })

      // Create sessions
      await tx.programSession.createMany({
        data: data.sessions.map((s, i) => ({
          programId: newProgram.id,
          weekNumber: s.weekNumber,
          serviceName: s.serviceName,
          description: s.description ?? null,
          duration: s.duration ?? null,
          sortOrder: i,
        })),
      })

      // Add creator as lead provider
      await tx.programProvider.create({
        data: {
          programId: newProgram.id,
          userId: auth.sub,
          role: 'lead',
        },
      })

      return newProgram
    })

    return NextResponse.json({ success: true, data: program }, { status: 201 })
  } catch (error) {
    console.error('POST /api/programs error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
