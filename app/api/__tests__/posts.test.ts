import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing routes
vi.mock('@/lib/db', () => ({
  default: {
    post: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    postLike: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    postComment: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn() },
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
  createPostSchema: {
    safeParse: vi.fn((data: unknown) => ({ success: true, data })),
  },
  createCommentSchema: {
    safeParse: vi.fn((data: unknown) => ({ success: true, data })),
  },
}))

import { GET as getPosts, POST as createPost } from '../posts/route'
import { DELETE as deletePost } from '../posts/[id]/route'
import { POST as likePost } from '../posts/[id]/like/route'
import { GET as getComments, POST as createComment } from '../posts/[id]/comments/route'
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

describe('GET /api/posts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with posts (public endpoint)', async () => {
    vi.mocked(prisma.post.findMany).mockResolvedValue([
      {
        id: 'post-1', content: 'Health tip', category: 'health', tags: [],
        imageUrl: null, likeCount: 5, createdAt: new Date(), updatedAt: new Date(),
        author: { id: 'doc-1', firstName: 'Dr', lastName: 'Smith', profileImage: null, userType: 'DOCTOR', verified: true, doctorProfile: { specialty: ['General'], clinicAffiliation: 'Clinic' } },
        _count: { comments: 3 },
      },
    ] as never)
    vi.mocked(prisma.post.count).mockResolvedValue(1 as never)

    const res = await getPosts(createGetRequest('/api/posts'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.posts).toHaveLength(1)
    expect(data.data.total).toBe(1)
  })
})

describe('POST /api/posts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await createPost(
      createPostRequest('/api/posts', { content: 'New post', category: 'health' })
    )

    expect(res.status).toBe(401)
  })

  it('allows any verified user to create post (not just doctors)', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'p@example.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ userType: 'PATIENT', verified: true } as never)
    vi.mocked(prisma.post.create).mockResolvedValue({ id: 'p1', content: 'Post', authorId: 'user-1' } as never)

    const res = await createPost(
      createPostRequest('/api/posts', { content: 'New post', category: 'health' })
    )

    expect(res.status).toBe(201)
  })

  it('returns 201 for verified doctor', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'doc-1', userType: 'doctor', email: 'd@example.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ userType: 'DOCTOR', verified: true } as never)
    vi.mocked(prisma.post.create).mockResolvedValue({
      id: 'post-new', content: 'New post', category: 'health', tags: [], imageUrl: null,
      likeCount: 0, isPublished: true, createdAt: new Date(), updatedAt: new Date(),
      author: { id: 'doc-1', firstName: 'Dr', lastName: 'Smith', profileImage: null, userType: 'DOCTOR', verified: true, doctorProfile: { specialty: ['General'], clinicAffiliation: 'Clinic' } },
    } as never)

    const res = await createPost(
      createPostRequest('/api/posts', { content: 'New post', category: 'health' })
    )
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe('post-new')
  })
})

describe('POST /api/posts/[id]/like', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await likePost(
      createPostRequest('/api/posts/post-1/like', {}),
      mockParams('post-1')
    )

    expect(res.status).toBe(401)
  })

  it('returns 404 when post not found', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'p@example.com' })
    vi.mocked(prisma.post.findUnique).mockResolvedValue(null)

    const res = await likePost(
      createPostRequest('/api/posts/post-1/like', {}),
      mockParams('post-1')
    )

    expect(res.status).toBe(404)
  })

  it('returns 200 with like toggle result', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'p@example.com' })
    vi.mocked(prisma.post.findUnique).mockResolvedValue({ id: 'post-1', likeCount: 5 } as never)
    vi.mocked(prisma.$transaction).mockResolvedValue({ liked: true, likeCount: 6 } as never)

    const res = await likePost(
      createPostRequest('/api/posts/post-1/like', {}),
      mockParams('post-1')
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.liked).toBe(true)
    expect(data.data.likeCount).toBe(6)
  })
})

describe('GET /api/posts/[id]/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when post not found', async () => {
    vi.mocked(prisma.post.findUnique).mockResolvedValue(null)

    const res = await getComments(
      createGetRequest('/api/posts/post-1/comments'),
      mockParams('post-1')
    )

    expect(res.status).toBe(404)
  })

  it('returns 200 with comments', async () => {
    vi.mocked(prisma.post.findUnique).mockResolvedValue({ id: 'post-1' } as never)
    vi.mocked(prisma.postComment.findMany).mockResolvedValue([
      {
        id: 'cmt-1', content: 'Great post!', createdAt: new Date(),
        author: { id: 'user-1', firstName: 'John', lastName: 'Doe', profileImage: null, userType: 'PATIENT' },
      },
    ] as never)
    vi.mocked(prisma.postComment.count).mockResolvedValue(1 as never)

    const res = await getComments(
      createGetRequest('/api/posts/post-1/comments'),
      mockParams('post-1')
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.comments).toHaveLength(1)
  })
})

describe('POST /api/posts/[id]/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await createComment(
      createPostRequest('/api/posts/post-1/comments', { content: 'Nice!' }),
      mockParams('post-1')
    )

    expect(res.status).toBe(401)
  })

  it('returns 201 for new comment', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'p@example.com' })
    vi.mocked(prisma.post.findUnique).mockResolvedValue({ id: 'post-1' } as never)
    vi.mocked(prisma.postComment.create).mockResolvedValue({
      id: 'cmt-new', content: 'Nice!', createdAt: new Date(),
      author: { id: 'user-1', firstName: 'John', lastName: 'Doe', profileImage: null, userType: 'PATIENT' },
    } as never)

    const res = await createComment(
      createPostRequest('/api/posts/post-1/comments', { content: 'Nice!' }),
      mockParams('post-1')
    )
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.content).toBe('Nice!')
  })
})

describe('GET /api/posts?category=health_tips', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filters posts by category query parameter', async () => {
    vi.mocked(prisma.post.findMany).mockResolvedValue([
      {
        id: 'post-ht', content: 'A health tip', category: 'health_tips', tags: [],
        imageUrl: null, likeCount: 2, createdAt: new Date(), updatedAt: new Date(),
        author: { id: 'doc-1', firstName: 'Dr', lastName: 'Smith', profileImage: null, userType: 'DOCTOR', verified: true, doctorProfile: { specialty: ['General'], clinicAffiliation: 'Clinic' } },
        _count: { comments: 0 },
      },
    ] as never)
    vi.mocked(prisma.post.count).mockResolvedValue(1 as never)

    const res = await getPosts(createGetRequest('/api/posts?category=health_tips'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.posts).toHaveLength(1)
    expect(data.data.posts[0].category).toBe('health_tips')
    expect(data.data.total).toBe(1)
  })

  it('returns paginated results with page and totalPages', async () => {
    vi.mocked(prisma.post.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.post.count).mockResolvedValue(25 as never)

    const res = await getPosts(createGetRequest('/api/posts?page=2&limit=10'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.page).toBe(2)
    expect(data.data.totalPages).toBe(3)
  })
})

describe('DELETE /api/posts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const req = new NextRequest('http://localhost:3000/api/posts/post-1', { method: 'DELETE' })
    const res = await deletePost(req, mockParams('post-1'))

    expect(res.status).toBe(401)
  })

  it('returns 404 when post not found', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'doc-1', userType: 'doctor', email: 'd@example.com' })
    vi.mocked(prisma.post.findUnique).mockResolvedValue(null)

    const req = new NextRequest('http://localhost:3000/api/posts/post-999', { method: 'DELETE' })
    const res = await deletePost(req, mockParams('post-999'))

    expect(res.status).toBe(404)
  })

  it('returns 200 when author deletes own post', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'doc-1', userType: 'doctor', email: 'd@example.com' })
    vi.mocked(prisma.post.findUnique).mockResolvedValue({ authorId: 'doc-1' } as never)
    vi.mocked(prisma.post.delete).mockResolvedValue({} as never)

    const req = new NextRequest('http://localhost:3000/api/posts/post-1', { method: 'DELETE' })
    const res = await deletePost(req, mockParams('post-1'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('returns 403 when non-author tries to delete', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'other-user', userType: 'doctor', email: 'other@example.com' })
    vi.mocked(prisma.post.findUnique).mockResolvedValue({ authorId: 'doc-1' } as never)

    const req = new NextRequest('http://localhost:3000/api/posts/post-1', { method: 'DELETE' })
    const res = await deletePost(req, mockParams('post-1'))

    expect(res.status).toBe(403)
  })
})
