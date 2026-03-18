import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import { trackConsultationUsage } from '@/lib/subscription/usage'
import { z } from 'zod'

const checkSchema = z.object({
  role: z.string().min(1),
  specialty: z.string().nullable().optional(),
})

/**
 * POST /api/users/[id]/subscription/check
 * Check and track consultation usage against the user's subscription.
 * Returns whether the consultation is covered (free) or needs payment.
 * Body: { role: 'DOCTOR', specialty?: 'General Practice' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (auth.sub !== id) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = checkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const result = await trackConsultationUsage(id, {
      role: parsed.data.role,
      specialty: parsed.data.specialty ?? undefined,
    })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('POST /api/users/[id]/subscription/check error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
