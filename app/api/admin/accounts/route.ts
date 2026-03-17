import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { adminAccountActionSchema } from '@/lib/validations/api'
import { rateLimitPublic } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  try {
    const auth = validateRequest(request)
    if (!auth || !['admin', 'regional-admin'].includes(auth.userType)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')

    // Regional admins only see accounts in their region
    let regionId: string | undefined
    if (auth.userType === 'regional-admin') {
      const adminUser = await prisma.user.findUnique({
        where: { id: auth.sub },
        select: { regionId: true },
      })
      if (!adminUser?.regionId) {
        // Fallback: try legacy country field from RegionalAdminProfile
        const profile = await prisma.regionalAdminProfile.findUnique({
          where: { userId: auth.sub },
          select: { country: true },
        })
        if (!profile?.country) {
          return NextResponse.json({ success: false, message: 'Region not configured' }, { status: 403 })
        }
        // Find region by country name
        const region = await prisma.region.findFirst({
          where: { name: { contains: profile.country, mode: 'insensitive' } },
          select: { id: true },
        })
        regionId = region?.id
      } else {
        regionId = adminUser.regionId
      }
    }

    const users = await prisma.user.findMany({
      where: {
        ...(status && status !== 'all' ? { accountStatus: status } : {}),
        ...(regionId ? { regionId } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        userType: true,
        accountStatus: true,
        profileImage: true,
        verified: true,
        createdAt: true,
        subscription: {
          select: {
            status: true,
            plan: { select: { name: true, slug: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error('Admin accounts error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  try {
    const auth = validateRequest(request)
    if (!auth || !['admin', 'regional-admin'].includes(auth.userType)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = adminAccountActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }
    const { userId, action } = parsed.data

    // Regional admins can only act on users in their region
    if (auth.userType === 'regional-admin') {
      const [adminUser, targetUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: auth.sub }, select: { regionId: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { regionId: true } }),
      ])
      if (adminUser?.regionId && targetUser?.regionId && targetUser.regionId !== adminUser.regionId) {
        return NextResponse.json({ success: false, message: 'Cannot manage accounts outside your region' }, { status: 403 })
      }
    }

    const newStatus = action === 'approve' ? 'active' : action === 'suspend' ? 'suspended' : 'suspended'

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: newStatus,
        verified: action === 'approve' ? true : undefined,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        accountStatus: true,
      },
    })

    return NextResponse.json({ success: true, data: user, message: `Account ${action}d successfully` })
  } catch (error) {
    console.error('Admin account update error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
