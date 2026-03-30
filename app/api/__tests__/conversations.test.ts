import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing routes
vi.mock('@/lib/db', () => ({
  default: {
    conversationParticipant: { findMany: vi.fn(), findUnique: vi.fn() },
    conversation: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    message: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    userConnection: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth/validate', () => ({
  validateRequest: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitPublic: vi.fn(() => null),
}))

vi.mock('@/lib/validations/api', () => ({
  createConversationSchema: {
    safeParse: vi.fn((data: unknown) => ({ success: true, data })),
  },
  sendMessageSchema: {
    safeParse: vi.fn((data: unknown) => ({ success: true, data })),
  },
}))

import { GET as getConversations, POST as postConversation } from '../conversations/route'
import { GET as getMessages, POST as postMessage } from '../conversations/[id]/messages/route'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { NextRequest } from 'next/server'

function createGetRequest(url: string) {
  return new NextRequest(`http://localhost:3000${url}`, { method: 'GET' })
}

function createPostRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('GET /api/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await getConversations(createGetRequest('/api/conversations'))

    expect(res.status).toBe(401)
  })

  it('returns 200 with empty conversations', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'p@example.com' })
    vi.mocked(prisma.conversationParticipant.findMany).mockResolvedValue([] as never)

    const res = await getConversations(createGetRequest('/api/conversations'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual([])
  })

  it('returns 200 with conversations and unread counts', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'p@example.com' })
    vi.mocked(prisma.conversationParticipant.findMany).mockResolvedValue([
      { conversationId: 'conv-1' },
    ] as never)
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([
      {
        id: 'conv-1', type: 'direct', createdAt: new Date(), updatedAt: new Date(),
        participants: [
          { userId: 'user-1', joinedAt: new Date(), user: { id: 'user-1', firstName: 'John', lastName: 'Doe', userType: 'PATIENT', profileImage: null } },
          { userId: 'user-2', joinedAt: new Date(), user: { id: 'user-2', firstName: 'Dr', lastName: 'Smith', userType: 'DOCTOR', profileImage: null } },
        ],
        messages: [{ id: 'msg-1', content: 'Hello', senderId: 'user-2', createdAt: new Date() }],
      },
    ] as never)
    vi.mocked(prisma.message.groupBy).mockResolvedValue([
      { conversationId: 'conv-1', _count: { id: 2 } },
    ] as never)

    const res = await getConversations(createGetRequest('/api/conversations'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
    expect(data.data[0].unreadCount).toBe(2)
  })
})

describe('POST /api/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await postConversation(
      createPostRequest('/api/conversations', { participantIds: ['user-2'] })
    )

    expect(res.status).toBe(401)
  })

  it('returns 201 for new conversation', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'p@example.com' })
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'user-1' },
      { id: 'user-2' },
    ] as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ userType: 'PATIENT' } as never)
    vi.mocked(prisma.userConnection.findFirst).mockResolvedValue({ id: 'conn-1', status: 'accepted' } as never)
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.conversation.create).mockResolvedValue({
      id: 'conv-new', type: 'direct', createdAt: new Date(), updatedAt: new Date(),
      participants: [
        { userId: 'user-1', joinedAt: new Date(), user: { id: 'user-1', firstName: 'John', lastName: 'Doe', userType: 'PATIENT', profileImage: null } },
        { userId: 'user-2', joinedAt: new Date(), user: { id: 'user-2', firstName: 'Dr', lastName: 'Smith', userType: 'DOCTOR', profileImage: null } },
      ],
    } as never)

    const res = await postConversation(
      createPostRequest('/api/conversations', { participantIds: ['user-2'] })
    )
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe('conv-new')
  })
})

describe('GET /api/conversations/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await getMessages(
      createGetRequest('/api/conversations/conv-1/messages'),
      mockParams('conv-1')
    )

    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not a participant', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'p@example.com' })
    vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue(null)

    const res = await getMessages(
      createGetRequest('/api/conversations/conv-1/messages'),
      mockParams('conv-1')
    )

    expect(res.status).toBe(403)
  })

  it('returns 200 with messages', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'p@example.com' })
    vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue({ userId: 'user-1' } as never)
    vi.mocked(prisma.message.findMany).mockResolvedValue([
      {
        id: 'msg-1', content: 'Hello', senderId: 'user-2', readAt: null, createdAt: new Date(),
        sender: { id: 'user-2', firstName: 'Dr', lastName: 'Smith', userType: 'DOCTOR' },
      },
    ] as never)
    vi.mocked(prisma.message.count).mockResolvedValue(1 as never)
    vi.mocked(prisma.message.updateMany).mockResolvedValue({ count: 1 } as never)

    const res = await getMessages(
      createGetRequest('/api/conversations/conv-1/messages'),
      mockParams('conv-1')
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
    expect(data.pagination).toBeDefined()
  })
})

describe('POST /api/conversations/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await postMessage(
      createPostRequest('/api/conversations/conv-1/messages', { content: 'Hi' }),
      mockParams('conv-1')
    )

    expect(res.status).toBe(401)
  })

  it('returns 201 when message is sent', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'p@example.com' })
    vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue({ userId: 'user-1' } as never)
    vi.mocked(prisma.$transaction).mockResolvedValue({
      id: 'msg-new', content: 'Hi', senderId: 'user-1', readAt: null, createdAt: new Date(),
      sender: { id: 'user-1', firstName: 'John', lastName: 'Doe', userType: 'PATIENT' },
    } as never)

    const res = await postMessage(
      createPostRequest('/api/conversations/conv-1/messages', { content: 'Hi' }),
      mockParams('conv-1')
    )
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.content).toBe('Hi')
  })
})
