import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    patientProfile: { create: vi.fn() },
    doctorProfile: { create: vi.fn() },
    patientEmergencyContact: { create: vi.fn() },
    userWallet: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    walletTransaction: { create: vi.fn() },
    document: { createMany: vi.fn() },
    region: { findUnique: vi.fn() },
    userPreference: { create: vi.fn() },
    referralPartnerProfile: { findUnique: vi.fn(), update: vi.fn() },
    referralClick: { update: vi.fn() },
    corporateAdminProfile: { findUnique: vi.fn() },
    corporateEmployee: { create: vi.fn() },
    notification: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitAuth: vi.fn(() => null),
}))

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(() => Promise.resolve('hashed')) },
}))

import { POST } from '../auth/register/route'
import prisma from '@/lib/db'
import { NextRequest } from 'next/server'

function createRegisterRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const baseBody = {
  fullName: 'Test User',
  email: 'test@example.com',
  password: 'password123',
  confirmPassword: 'password123',
  phone: '+230 5555 1234',
  dateOfBirth: '1990-01-01',
  gender: 'male',
  address: '123 Main St',
  agreeToTerms: true,
  agreeToPrivacy: true,
  agreeToDisclaimer: true,
}

describe('POST /api/auth/register — corporate enrollment', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('creates patient with pending_corporate status when enrolling in company', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        user: {
          create: vi.fn().mockResolvedValue({ id: 'new-user-1' }),
          update: vi.fn(),
        },
        patientProfile: { create: vi.fn().mockResolvedValue({ id: 'pat-1', userId: 'new-user-1' }) },
        userWallet: { create: vi.fn() },
        document: { createMany: vi.fn() },
        corporateAdminProfile: {
          findUnique: vi.fn().mockResolvedValue({ userId: 'corp-admin-1', companyName: 'Test Corp' }),
        },
        corporateEmployee: { create: vi.fn() },
        notification: { create: vi.fn() },
        patientEmergencyContact: { create: vi.fn() },
      }
      return (fn as (tx: Record<string, unknown>) => Promise<unknown>)(tx)
    })

    const res = await POST(createRegisterRequest({
      ...baseBody,
      userType: 'patient',
      enrolledInCompany: true,
      companyId: 'corp-profile-1',
    }))

    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.accountStatus).toBe('pending_corporate')
    expect(json.message).toContain('corporate administrator')
  })

  it('creates doctor with specialist category', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    let capturedCategory = ''

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        user: {
          create: vi.fn().mockResolvedValue({ id: 'new-doc-1' }),
          update: vi.fn(),
        },
        doctorProfile: {
          create: vi.fn().mockImplementation((args: { data: { category: string } }) => {
            capturedCategory = args.data.category
            return { id: 'doc-prof-1', ...args.data }
          }),
        },
        userWallet: { create: vi.fn(), findUnique: vi.fn() },
        document: { createMany: vi.fn() },
        platformService: { findMany: vi.fn().mockResolvedValue([]) },
        providerServiceConfig: { createMany: vi.fn() },
        region: { findUnique: vi.fn() },
      }
      return (fn as (tx: Record<string, unknown>) => Promise<unknown>)(tx)
    })

    const res = await POST(createRegisterRequest({
      ...baseBody,
      userType: 'doctor',
      doctorCategory: 'specialist',
      specialization: 'Cardiology',
    }))

    expect(res.status).toBe(201)
    expect(capturedCategory).toBe('Specialist')
  })

  it('creates doctor with General Practitioner category by default', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    let capturedCategory = ''

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        user: {
          create: vi.fn().mockResolvedValue({ id: 'new-doc-2' }),
          update: vi.fn(),
        },
        doctorProfile: {
          create: vi.fn().mockImplementation((args: { data: { category: string } }) => {
            capturedCategory = args.data.category
            return { id: 'doc-prof-2', ...args.data }
          }),
        },
        userWallet: { create: vi.fn(), findUnique: vi.fn() },
        document: { createMany: vi.fn() },
        platformService: { findMany: vi.fn().mockResolvedValue([]) },
        providerServiceConfig: { createMany: vi.fn() },
        region: { findUnique: vi.fn() },
      }
      return (fn as (tx: Record<string, unknown>) => Promise<unknown>)(tx)
    })

    const res = await POST(createRegisterRequest({
      ...baseBody,
      userType: 'doctor',
    }))

    expect(res.status).toBe(201)
    expect(capturedCategory).toBe('General Practitioner')
  })
})
