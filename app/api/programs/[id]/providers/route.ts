import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'

/**
 * POST /api/programs/[id]/providers
 * Add a collaborating provider to a program. Only the lead provider can add.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const auth = await validateRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { userId } = body as { userId: string }

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Provider userId is required' }, { status: 400 })
    }

    // Verify caller is lead provider
    const lead = await prisma.programProvider.findFirst({
      where: { programId: id, userId: auth.sub, role: 'lead' },
    })
    if (!lead) {
      return NextResponse.json({ success: false, message: 'Only the lead provider can add collaborators' }, { status: 403 })
    }

    // Check if already a provider
    const existing = await prisma.programProvider.findUnique({
      where: { programId_userId: { programId: id, userId } },
    })
    if (existing) {
      return NextResponse.json({ success: false, message: 'Provider already added to this program' }, { status: 409 })
    }

    const provider = await prisma.programProvider.create({
      data: { programId: id, userId, role: 'collaborator' },
    })

    return NextResponse.json({ success: true, data: provider })
  } catch (error) {
    console.error('POST /api/programs/[id]/providers error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
