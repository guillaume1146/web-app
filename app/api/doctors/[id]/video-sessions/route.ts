import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import prisma from '@/lib/db'
import { rateLimitPublic } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (auth.sub !== id) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50)

    const sessions = await prisma.videoCallSession.findMany({
      where: { userId: id },
      select: {
        id: true,
        roomId: true,
        startedAt: true,
        endedAt: true,
        duration: true,
        callQuality: true,
        status: true,
        notes: true,
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    })

    // Get room details and participants for each session
    const roomIds = [...new Set(sessions.map((s) => s.roomId))]
    const rooms = await prisma.videoRoom.findMany({
      where: { id: { in: roomIds } },
      select: {
        id: true,
        roomCode: true,
        name: true,
        participants: {
          select: { userId: true },
        },
      },
    })

    // Get other participant user info
    const otherUserIds = rooms.flatMap((r) =>
      r.participants.filter((p) => p.userId !== id).map((p) => p.userId)
    )
    const users = await prisma.user.findMany({
      where: { id: { in: otherUserIds } },
      select: { id: true, firstName: true, lastName: true, userType: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))
    const roomMap = new Map(rooms.map((r) => [r.id, r]))

    const data = sessions.map((s) => {
      const room = roomMap.get(s.roomId)
      const otherUserId = room?.participants.find((p) => p.userId !== id)?.userId
      const otherUser = otherUserId ? userMap.get(otherUserId) : null
      return {
        id: s.id,
        roomCode: room?.roomCode ?? null,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt?.toISOString() ?? null,
        duration: s.duration,
        callQuality: s.callQuality,
        status: s.status,
        participantName: otherUser
          ? `${otherUser.firstName} ${otherUser.lastName}`
          : 'Unknown',
        participantType: otherUser?.userType ?? null,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Video sessions fetch error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
