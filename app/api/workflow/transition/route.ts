import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import { transition, WorkflowError, instanceRepo, registerAllStrategies } from '@/lib/workflow'

// Ensure strategies are registered
registerAllStrategies()
import type { ActionRole, ContentType } from '@/lib/workflow'
import { z } from 'zod'

const CONTENT_TYPES = ['prescription', 'lab_result', 'care_notes', 'report', 'dental_chart', 'eye_prescription', 'meal_plan', 'exercise_plan'] as const

const transitionSchema = z.object({
  instanceId: z.string().min(1).optional(),
  bookingId: z.string().min(1).optional(),
  bookingType: z.string().min(1).optional(),
  action: z.string().min(1),
  notes: z.string().optional(),
  contentType: z.enum(CONTENT_TYPES).optional(),
  contentData: z.any().optional(),
  inventoryItems: z.array(z.object({
    itemId: z.string().min(1),
    quantity: z.number().int().positive(),
  })).optional(),
}).refine(
  (data) => data.instanceId || (data.bookingId && data.bookingType),
  { message: 'Either instanceId or both bookingId and bookingType are required' }
)

export async function POST(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = transitionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    // Determine role by checking if user is patient or provider on this instance
    const role = await resolveUserRole(
      auth.sub,
      parsed.data.instanceId,
      parsed.data.bookingId,
      parsed.data.bookingType
    )

    if (!role) {
      return NextResponse.json(
        { success: false, message: 'You are not a participant in this workflow' },
        { status: 403 }
      )
    }

    const result = await transition({
      ...parsed.data,
      contentType: parsed.data.contentType as ContentType | undefined,
      actionByUserId: auth.sub,
      actionByRole: role,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof WorkflowError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 })
    }
    console.error('POST /api/workflow/transition error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

async function resolveUserRole(
  userId: string,
  instanceId?: string,
  bookingId?: string,
  bookingType?: string
): Promise<ActionRole | null> {
  let instance
  if (instanceId) {
    instance = await instanceRepo.findInstanceById(instanceId)
  } else if (bookingId && bookingType) {
    instance = await instanceRepo.findInstanceByBooking(bookingId, bookingType)
  }

  if (!instance) return null
  if (instance.patientUserId === userId) return 'patient'
  if (instance.providerUserId === userId) return 'provider'
  return null
}
