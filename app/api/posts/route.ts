import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import prisma from '@/lib/db'
import { rateLimitPublic } from '@/lib/rate-limit'
import { createPostSchema } from '@/lib/validations/api'

// GET /api/posts — Public feed, paginated, filterable by category
export async function GET(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
  const category = searchParams.get('category')

  try {
    const where = {
      isPublished: true,
      ...(category ? { category } : {}),
    }

    const [posts, total] = await Promise.all([
      prisma.doctorPost.findMany({
        where,
        select: {
          id: true,
          content: true,
          category: true,
          tags: true,
          imageUrl: true,
          likeCount: true,
          companyId: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              userType: true,
              verified: true,
              doctorProfile: {
                select: {
                  specialty: true,
                  clinicAffiliation: true,
                },
              },
            },
          },
          company: {
            select: {
              id: true,
              companyName: true,
            },
          },
          _count: {
            select: { comments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.doctorPost.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        posts,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Posts feed fetch error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// POST /api/posts — Create post (any verified user, optionally as company)
export async function POST(request: NextRequest) {
  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: { userType: true, verified: true },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    if (!user.verified) {
      return NextResponse.json({ success: false, message: 'Account must be verified to create posts' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createPostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    // Optional: post as company (LinkedIn-style)
    let companyId: string | null = null
    if (body.companyId) {
      // Verify the user owns this company
      const company = await prisma.corporateAdminProfile.findFirst({
        where: { id: body.companyId, userId: auth.sub },
      })
      if (!company) {
        return NextResponse.json({ success: false, message: 'You do not own this company page' }, { status: 403 })
      }
      companyId = company.id
    }

    const post = await prisma.doctorPost.create({
      data: {
        authorId: auth.sub,
        companyId,
        content: parsed.data.content.trim(),
        category: parsed.data.category || null,
        tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
        imageUrl: parsed.data.imageUrl || null,
      },
      select: {
        id: true,
        content: true,
        category: true,
        tags: true,
        imageUrl: true,
        likeCount: true,
        companyId: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            userType: true,
            verified: true,
            doctorProfile: {
              select: {
                specialty: true,
                clinicAffiliation: true,
              },
            },
          },
        },
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: post }, { status: 201 })
  } catch (error) {
    console.error('Post creation error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
