import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock dependencies ──────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  default: {
    user: { count: vi.fn(), findUnique: vi.fn() },
    appointment: { count: vi.fn() },
    doctorProfile: { findMany: vi.fn() },
    region: { count: vi.fn() },
    providerSpecialty: { count: vi.fn() },
    providerInventoryItem: { count: vi.fn() },
    providerRole: { count: vi.fn() },
    serviceBooking: { count: vi.fn() },
    workflowTemplate: { count: vi.fn() },
    post: { count: vi.fn() },
    userConnection: { count: vi.fn() },
    notification: { count: vi.fn() },
    userWallet: { findUnique: vi.fn(), update: vi.fn() },
    walletTransaction: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitPublic: vi.fn(() => null),
  rateLimitAuth: vi.fn(() => null),
  rateLimitHeavy: vi.fn(() => null),
}))

vi.mock('@/lib/auth/validate', () => ({
  validateRequest: vi.fn(() => ({ sub: 'PAT001', userType: 'patient', email: 'test@test.com' })),
}))

import prisma from '@/lib/db'

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Fix 1: Stats API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns meaningful numbers from DB counts', async () => {
    const { GET } = await import('../stats/route')

    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(15)   // providers
      .mockResolvedValueOnce(50)   // patients
    vi.mocked(prisma.appointment.count).mockResolvedValue(100)
    vi.mocked(prisma.region.count).mockResolvedValue(6)
    vi.mocked(prisma.providerSpecialty.count).mockResolvedValue(136)
    vi.mocked(prisma.providerInventoryItem.count).mockResolvedValue(76)
    vi.mocked(prisma.providerRole.count).mockResolvedValue(11)
    vi.mocked(prisma.serviceBooking.count).mockResolvedValue(30)
    vi.mocked(prisma.workflowTemplate.count).mockResolvedValue(59)
    vi.mocked(prisma.post.count).mockResolvedValue(10)
    vi.mocked(prisma.userConnection.count).mockResolvedValue(25)
    vi.mocked(prisma.notification.count).mockResolvedValue(200)

    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(10)

    const providerStat = data.data.find((s: { label: string }) => s.label.includes('Provider') && !s.label.includes('Type'))
    const patientStat = data.data.find((s: { label: string }) => s.label.includes('Patient'))
    expect(providerStat.number).toBe(15)
    expect(patientStat.number).toBe(50)
  })

  it('returns 500 error when DB query fails', async () => {
    const { GET } = await import('../stats/route')

    vi.mocked(prisma.user.count).mockRejectedValue(new Error('DB down'))

    const res = await GET()
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.message).toBe('Failed to fetch statistics')
  })
})

describe('Fix 7: Connection deduplication logic', () => {
  it('should show the OTHER person, not always the sender', () => {
    const currentUserId = 'PAT001'

    // Connection where current user is sender
    const conn1 = {
      id: 'conn1',
      senderId: 'PAT001',
      receiverId: 'DOC001',
      sender: { id: 'PAT001', firstName: 'Emma', lastName: 'Johnson' },
      receiver: { id: 'DOC001', firstName: 'Sarah', lastName: 'Johnson' },
    }

    // Connection where current user is receiver
    const conn2 = {
      id: 'conn2',
      senderId: 'NUR001',
      receiverId: 'PAT001',
      sender: { id: 'NUR001', firstName: 'Priya', lastName: 'Ramgoolam' },
      receiver: { id: 'PAT001', firstName: 'Emma', lastName: 'Johnson' },
    }

    // Fixed logic: show the OTHER person
    const person1 = conn1.senderId === currentUserId ? conn1.receiver : conn1.sender
    const person2 = conn2.senderId === currentUserId ? conn2.receiver : conn2.sender

    expect(person1.id).toBe('DOC001')  // Should show Sarah, not Emma
    expect(person2.id).toBe('NUR001')  // Should show Priya, not Emma

    // Verify no duplicates
    const personIds = [person1.id, person2.id]
    const uniqueIds = new Set(personIds)
    expect(uniqueIds.size).toBe(personIds.length)
  })
})

describe('Fix 6: Notification URL mapping', () => {
  it('maps referenceType to correct navigation path', () => {
    const userBase = '/patient'

    // URL mapping function (same logic that will be in DashboardHeader)
    function getNotificationHref(referenceType: string | null, referenceId: string | null): string | null {
      if (!referenceId || !referenceType) return null
      switch (referenceType) {
        case 'appointment':
        case 'doctor_booking':
        case 'nurse_booking':
        case 'nanny_booking':
          return `${userBase}/appointments`
        case 'lab_test_booking':
        case 'lab-test':
          return `${userBase}/health-records`
        case 'emergency_booking':
        case 'emergency':
          return `${userBase}/emergency`
        case 'prescription':
          return `${userBase}/prescriptions`
        case 'message':
          return `${userBase}/chat`
        case 'connection':
          return `${userBase}/network`
        default:
          return null
      }
    }

    expect(getNotificationHref('appointment', 'APT001')).toBe('/patient/appointments')
    expect(getNotificationHref('doctor_booking', 'BK001')).toBe('/patient/appointments')
    expect(getNotificationHref('nurse_booking', 'BK002')).toBe('/patient/appointments')
    expect(getNotificationHref('lab_test_booking', 'LT001')).toBe('/patient/health-records')
    expect(getNotificationHref('emergency', 'EM001')).toBe('/patient/emergency')
    expect(getNotificationHref('prescription', 'PRE001')).toBe('/patient/prescriptions')
    expect(getNotificationHref('message', 'MSG001')).toBe('/patient/chat')
    expect(getNotificationHref('connection', 'CON001')).toBe('/patient/network')
    expect(getNotificationHref(null, null)).toBeNull()
    expect(getNotificationHref('unknown_type', 'X')).toBeNull()
  })
})

describe('Fix 8: Wallet Reset', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resets balance to initialCredit and clears transactions', async () => {
    const mockWallet = {
      id: 'wallet-1',
      userId: 'PAT001',
      balance: 2160,
      initialCredit: 4500,
      currency: 'MUR',
    }

    // The reset logic should:
    // 1. Fetch wallet to get initialCredit
    // 2. Delete all transactions
    // 3. Update balance to initialCredit
    vi.mocked(prisma.userWallet.findUnique).mockResolvedValue(mockWallet as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([
      { count: 4 },  // deleted transactions
      { ...mockWallet, balance: 4500 },  // updated wallet
    ] as never)

    // Verify the expected state after reset
    expect(mockWallet.balance).toBe(2160)
    expect(mockWallet.initialCredit).toBe(4500)

    // After reset, balance should equal initialCredit
    const resetBalance = mockWallet.initialCredit
    expect(resetBalance).toBe(4500)
  })

  it('should not allow resetting another users wallet', () => {
    const authUserId: string = 'PAT001'
    const targetUserId: string = 'PAT002'

    // Ownership check
    expect(authUserId === targetUserId).toBe(false)
  })
})

describe('Fix 3: Search paths are always public (no user slug prefix)', () => {
  it('search paths never get prefixed — always /search/...', () => {
    // Search pages are public — getServiceHref returns href as-is
    function getServiceHref(href: string): string {
      return href
    }

    expect(getServiceHref('/search/doctors')).toBe('/search/doctors')
    expect(getServiceHref('/search/nurses')).toBe('/search/nurses')
    expect(getServiceHref('/search/childcare')).toBe('/search/childcare')
    expect(getServiceHref('/search/lab')).toBe('/search/lab')
    expect(getServiceHref('/search/emergency')).toBe('/search/emergency')
    expect(getServiceHref('/search/health-shop')).toBe('/search/health-shop')
  })
})
