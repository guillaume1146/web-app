import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import { instanceRepo } from '@/lib/workflow'

export async function GET(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const role = (searchParams.get('role') as 'patient' | 'provider') || 'patient'
    const status = searchParams.get('status') || undefined
    const bookingType = searchParams.get('bookingType') || undefined

    const instances = await instanceRepo.findInstancesByUser(auth.sub, role, {
      currentStatus: status,
      bookingType,
    })

    return NextResponse.json({ success: true, data: instances })
  } catch (error) {
    console.error('GET /api/workflow/instances error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
