import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import prisma from '@/lib/db'
import * as repo from '@/lib/inventory/repository'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const items = await repo.findItemsByProvider(auth.sub)
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error('GET /api/inventory error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

const createItemSchema = z.object({
  name: z.string().min(1),
  genericName: z.string().optional(),
  category: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  unitOfMeasure: z.string().default('unit'),
  strength: z.string().optional(),
  dosageForm: z.string().optional(),
  price: z.number().positive(),
  quantity: z.number().int().min(0),
  minStockAlert: z.number().int().min(0).default(5),
  requiresPrescription: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  sideEffects: z.array(z.string()).default([]),
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
    const parsed = createItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    // Get provider's user type
    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: { userType: true },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    const item = await repo.createItem(auth.sub, user.userType, parsed.data)
    return NextResponse.json({ success: true, data: item }, { status: 201 })
  } catch (error) {
    console.error('POST /api/inventory error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
