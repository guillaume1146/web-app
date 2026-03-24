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
    const existing = await repo.findOrderById(id)

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 })
    }

    if (existing.providerUserId !== auth.sub) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status } = body

    const validStatuses = ['confirmed', 'preparing', 'ready_for_pickup', 'ready_for_delivery', 'delivery_in_progress', 'delivered', 'picked_up', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: `Invalid status: ${status}` }, { status: 400 })
    }

    const extra: { confirmedAt?: Date; deliveredAt?: Date; cancelledAt?: Date } = {}
    if (status === 'confirmed') extra.confirmedAt = new Date()
    if (status === 'delivered' || status === 'picked_up') extra.deliveredAt = new Date()
    if (status === 'cancelled') extra.cancelledAt = new Date()

    const order = await repo.updateOrderStatus(id, status, extra)

    return NextResponse.json({ success: true, data: order })
  } catch (error) {
    console.error('PATCH /api/inventory/orders/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
