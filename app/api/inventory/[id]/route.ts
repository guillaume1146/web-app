import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import * as repo from '@/lib/inventory/repository'

export async function PATCH(
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
    const existing = await repo.findItemById(id)

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Item not found' }, { status: 404 })
    }
    if (existing.providerUserId !== auth.sub) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const item = await repo.updateItem(id, body)

    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    console.error('PATCH /api/inventory/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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
    const existing = await repo.findItemById(id)

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Item not found' }, { status: 404 })
    }
    if (existing.providerUserId !== auth.sub) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    await repo.deactivateItem(id)
    return NextResponse.json({ success: true, data: { id, deactivated: true } })
  } catch (error) {
    console.error('DELETE /api/inventory/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
