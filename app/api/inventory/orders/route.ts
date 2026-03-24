import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import * as repo from '@/lib/inventory/repository'
import { placeOrder } from '@/lib/inventory/order-service'
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
    const role = searchParams.get('role') || 'patient'

    const orders = role === 'provider'
      ? await repo.findOrdersByProvider(auth.sub)
      : await repo.findOrdersByPatient(auth.sub)

    return NextResponse.json({ success: true, data: orders })
  } catch (error) {
    console.error('GET /api/inventory/orders error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

const createOrderSchema = z.object({
  providerUserId: z.string().min(1),
  providerType: z.string().min(1),
  deliveryType: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryFee: z.number().min(0).optional(),
  items: z.array(z.object({
    inventoryItemId: z.string().min(1),
    quantity: z.number().int().positive(),
  })).min(1),
})

export async function POST(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const result = await placeOrder(auth.sub, parsed.data)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, data: result.order }, { status: 201 })
  } catch (error) {
    console.error('POST /api/inventory/orders error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
