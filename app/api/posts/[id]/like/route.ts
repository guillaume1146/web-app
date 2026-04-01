import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import prisma from '@/lib/db'
import { rateLimitPublic } from '@/lib/rate-limit'

// POST /api/posts/[id]/like — Toggle like (authenticated users only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true, likeCount: true },
    })

    if (!post) {
      return NextResponse.json({ success: false, message: 'Post not found' }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingLike = await tx.postLike.findUnique({
        where: { postId_userId: { postId: id, userId: auth.sub } },
      })

      if (existingLike) {
        // Unlike: delete the like and decrement count
        await tx.postLike.delete({
          where: { postId_userId: { postId: id, userId: auth.sub } },
        })
        const updatedPost = await tx.post.update({
          where: { id },
          data: { likeCount: { decrement: 1 } },
          select: { likeCount: true },
        })
        return { liked: false, likeCount: updatedPost.likeCount }
      } else {
        // Like: create the like and increment count
        await tx.postLike.create({
          data: { postId: id, userId: auth.sub },
        })
        const updatedPost = await tx.post.update({
          where: { id },
          data: { likeCount: { increment: 1 } },
          select: { likeCount: true },
        })
        return { liked: true, likeCount: updatedPost.likeCount }
      }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Like toggle error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
