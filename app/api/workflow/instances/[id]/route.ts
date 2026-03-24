import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import { getState } from '@/lib/workflow'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const state = await getState(id)

    if (!state) {
      return NextResponse.json({ success: false, message: 'Workflow instance not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: state })
  } catch (error) {
    console.error('GET /api/workflow/instances/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
