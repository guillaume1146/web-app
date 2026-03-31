import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing the route
vi.mock('@/lib/db', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  },
}))

vi.mock('@/lib/auth/jwt', () => ({
  signToken: vi.fn(() => 'mock-jwt-token'),
}))

vi.mock('@/lib/auth/cookies', () => ({
  setAuthCookies: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitAuth: vi.fn(() => null),
}))

import { POST } from '../auth/login/route'
import prisma from '@/lib/db'
import bcrypt from 'bcrypt'
import { NextRequest } from 'next/server'

function createRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for invalid email', async () => {
    const res = await POST(createRequest({ email: 'bad', password: '123456' }))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('returns 400 for short password', async () => {
    const res = await POST(createRequest({ email: 'test@example.com', password: '12' }))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('returns 401 for non-existent user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const res = await POST(createRequest({ email: 'noone@example.com', password: '123456' }))
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.message).toBe('Invalid email or password')
  })

  it('returns 401 for wrong password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: '$2b$10$hash',
      profileImage: null,
      userType: 'PATIENT',
      accountStatus: 'active',
    } as never)

    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const res = await POST(createRequest({ email: 'john@example.com', password: 'wrongpass' }))
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('returns 403 for pending account', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: '$2b$10$hash',
      profileImage: null,
      userType: 'PATIENT',
      accountStatus: 'pending',
    } as never)

    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const res = await POST(createRequest({ email: 'john@example.com', password: '123456' }))
    const data = await res.json()

    expect(res.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.message).toContain('pending')
  })

  it('returns 403 for suspended account', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: '$2b$10$hash',
      profileImage: null,
      userType: 'PATIENT',
      accountStatus: 'suspended',
    } as never)

    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const res = await POST(createRequest({ email: 'john@example.com', password: '123456' }))
    const data = await res.json()

    expect(res.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.message).toContain('suspended')
  })

  it('returns success with redirectPath for valid credentials', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: '$2b$10$hash',
      profileImage: null,
      userType: 'PATIENT',
      accountStatus: 'active',
    } as never)

    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const res = await POST(createRequest({ email: 'john@example.com', password: '123456' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.user.id).toBe('user-1')
    expect(data.user.userType).toBe('patient')
    expect(data.redirectPath).toMatch(/\/\w+\/feed/)
  })

  it('returns correct redirectPath for doctor', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'doc-1',
      firstName: 'Sarah',
      lastName: 'Smith',
      email: 'sarah@example.com',
      password: '$2b$10$hash',
      profileImage: null,
      userType: 'DOCTOR',
      accountStatus: 'active',
    } as never)

    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const res = await POST(createRequest({ email: 'sarah@example.com', password: '123456' }))
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(data.user.userType).toBe('doctor')
    expect(data.redirectPath).toMatch(/\/\w+\/feed/)
  })

  it('returns correct redirectPath for nurse', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'nurse-1',
      firstName: 'Alice',
      lastName: 'Brown',
      email: 'alice@example.com',
      password: '$2b$10$hash',
      profileImage: null,
      userType: 'NURSE',
      accountStatus: 'active',
    } as never)

    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const res = await POST(createRequest({ email: 'alice@example.com', password: '123456' }))
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(data.redirectPath).toMatch(/\/\w+\/feed/)
  })

  it('does not require userType field', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: '$2b$10$hash',
      profileImage: null,
      userType: 'PATIENT',
      accountStatus: 'active',
    } as never)

    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    // No userType in body — should still work
    const res = await POST(createRequest({ email: 'john@example.com', password: '123456' }))
    const data = await res.json()

    expect(data.success).toBe(true)
  })
})
