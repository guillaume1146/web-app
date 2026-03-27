import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import { templateRepo } from '@/lib/workflow'
import prisma from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const templates = await templateRepo.findTemplates({
      createdByAdminId: auth.sub,
      providerType: searchParams.get('providerType') || undefined,
      serviceMode: searchParams.get('serviceMode') || undefined,
      platformServiceId: searchParams.get('platformServiceId') || undefined,
    })

    return NextResponse.json({ success: true, data: templates })
  } catch (error) {
    console.error('GET /api/regional/workflow-templates error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

const stepSchema = z.object({
  order: z.number().int().positive(),
  statusCode: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  actionsForPatient: z.array(z.any()).default([]),
  actionsForProvider: z.array(z.any()).default([]),
  flags: z.any().default({}),
  notifyPatient: z.object({ title: z.string(), message: z.string() }).nullable().optional(),
  notifyProvider: z.object({ title: z.string(), message: z.string() }).nullable().optional(),
})

const transitionDefSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  action: z.string().min(1),
  allowedRoles: z.array(z.enum(['patient', 'provider', 'system'])),
  conditions: z.any().optional(),
})

const createTemplateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  providerType: z.string().min(1),
  serviceMode: z.enum(['office', 'home', 'video']),
  platformServiceId: z.string().optional(),
  steps: z.array(stepSchema).min(1),
  transitions: z.array(transitionDefSchema),
})

export async function POST(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: { userType: true },
    })

    if (!user || user.userType !== 'REGIONAL_ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 })
    }

    const adminProfile = await prisma.regionalAdminProfile.findUnique({
      where: { userId: auth.sub },
      select: { region: true, countryCode: true },
    })

    if (!adminProfile) {
      return NextResponse.json(
        { success: false, message: 'Regional admin profile not found' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = createTemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const template = await templateRepo.createTemplate({
      ...parsed.data,
      steps: parsed.data.steps as unknown as Prisma.InputJsonValue,
      transitions: parsed.data.transitions as unknown as Prisma.InputJsonValue,
      createdByAdminId: auth.sub,
      regionCode: adminProfile.countryCode || adminProfile.region,
      isDefault: false,
    })

    return NextResponse.json({ success: true, data: template }, { status: 201 })
  } catch (error) {
    console.error('POST /api/regional/workflow-templates error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
