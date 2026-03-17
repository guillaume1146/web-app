import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import prisma from '@/lib/db'
import { updatePostSchema } from '@/lib/validations/api'
import { rateLimitPublic } from '@/lib/rate-limit'

// GET /api/posts/[id] — Single post with comments preview
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const { id } = await params

  try {
    const post = await prisma.doctorPost.findUnique({
      where: { id },
      select: {
        id: true,
        content: true,
        category: true,
        tags: true,
        likeCount: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
        authorId: true,
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
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
                userType: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: 5,
        },
        _count: {
          select: { comments: true },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ success: false, message: 'Post not found' }, { status: 404 })
    }

    // Check if current user liked this post (if authenticated)
    let userLiked = false
    const auth = validateRequest(request)
    if (auth) {
      const like = await prisma.postLike.findUnique({
        where: { postId_userId: { postId: id, userId: auth.sub } },
      })
      userLiked = !!like
    }

    return NextResponse.json({
      success: true,
      data: { post, userLiked },
    })
  } catch (error) {
    console.error('Post fetch error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// PUT /api/posts/[id] — Update post (author only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    // Verify ownership
    const post = await prisma.doctorPost.findUnique({
      where: { id },
      select: { authorId: true },
    })

    if (!post) {
      return NextResponse.json({ success: false, message: 'Post not found' }, { status: 404 })
    }

    if (auth.sub !== post.authorId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updatePostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { content, category, tags, isPublished } = parsed.data

    const updateData: Record<string, unknown> = {}
    if (content !== undefined) {
      updateData.content = content.trim()
    }
    if (category !== undefined) updateData.category = category
    if (tags !== undefined) updateData.tags = tags
    if (isPublished !== undefined) updateData.isPublished = isPublished

    const updatedPost = await prisma.doctorPost.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        content: true,
        category: true,
        tags: true,
        likeCount: true,
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
        _count: {
          select: { comments: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: updatedPost })
  } catch (error) {
    console.error('Post update error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/posts/[id] — Delete post (author only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    // Verify ownership
    const post = await prisma.doctorPost.findUnique({
      where: { id },
      select: { authorId: true },
    })

    if (!post) {
      return NextResponse.json({ success: false, message: 'Post not found' }, { status: 404 })
    }

    if (auth.sub !== post.authorId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    await prisma.doctorPost.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Post delete error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
