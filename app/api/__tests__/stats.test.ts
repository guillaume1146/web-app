import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    user: { count: vi.fn() },
    appointment: { count: vi.fn() },
    region: { count: vi.fn() },
    providerSpecialty: { count: vi.fn() },
    providerInventoryItem: { count: vi.fn() },
    providerRole: { count: vi.fn() },
    serviceBooking: { count: vi.fn() },
    workflowTemplate: { count: vi.fn() },
    post: { count: vi.fn() },
    userConnection: { count: vi.fn() },
    notification: { count: vi.fn() },
  },
}))

import { GET } from '../stats/route'
import prisma from '@/lib/db'

describe('GET /api/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default all counts to 0
    vi.mocked(prisma.user.count).mockResolvedValue(0)
    vi.mocked(prisma.appointment.count).mockResolvedValue(0)
    vi.mocked(prisma.region.count).mockResolvedValue(0)
    vi.mocked(prisma.providerSpecialty.count).mockResolvedValue(0)
    vi.mocked(prisma.providerInventoryItem.count).mockResolvedValue(0)
    vi.mocked(prisma.providerRole.count).mockResolvedValue(0)
    vi.mocked(prisma.serviceBooking.count).mockResolvedValue(0)
    vi.mocked(prisma.workflowTemplate.count).mockResolvedValue(0)
    vi.mocked(prisma.post.count).mockResolvedValue(0)
    vi.mocked(prisma.userConnection.count).mockResolvedValue(0)
    vi.mocked(prisma.notification.count).mockResolvedValue(0)
  })

  it('returns 10 stat items', async () => {
    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(10)
  })

  it('includes all expected stat labels', async () => {
    const res = await GET()
    const data = await res.json()
    const labels = data.data.map((s: { label: string }) => s.label)

    expect(labels).toContain('Healthcare Providers')
    expect(labels).toContain('Registered Patients')
    expect(labels).toContain('Medical Specialties')
    expect(labels).toContain('Health Products')
    expect(labels).toContain('Consultations')
    expect(labels).toContain('Regions Covered')
    expect(labels).toContain('Provider Types')
    expect(labels).toContain('Care Workflows')
    expect(labels).toContain('Community Posts')
    expect(labels).toContain('Connections Made')
  })

  it('includes emoji icons for each stat', async () => {
    const res = await GET()
    const data = await res.json()

    for (const stat of data.data) {
      expect(stat.icon).toBeTruthy()
    }
  })

  it('returns real DB counts', async () => {
    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(25)  // providers
      .mockResolvedValueOnce(200) // patients
    vi.mocked(prisma.providerSpecialty.count).mockResolvedValue(136)
    vi.mocked(prisma.providerInventoryItem.count).mockResolvedValue(76)
    vi.mocked(prisma.region.count).mockResolvedValue(6)

    const res = await GET()
    const data = await res.json()

    const providers = data.data.find((s: { label: string }) => s.label === 'Healthcare Providers')
    const patients = data.data.find((s: { label: string }) => s.label === 'Registered Patients')
    expect(providers.number).toBe(25)
    expect(patients.number).toBe(200)
  })

  it('combines appointments + service bookings for Consultations', async () => {
    vi.mocked(prisma.appointment.count).mockResolvedValue(100)
    vi.mocked(prisma.serviceBooking.count).mockResolvedValue(50)

    const res = await GET()
    const data = await res.json()

    const consultations = data.data.find((s: { label: string }) => s.label === 'Consultations')
    expect(consultations.number).toBe(150) // 100 + 50
  })

  it('returns 500 on database failure', async () => {
    vi.mocked(prisma.user.count).mockRejectedValue(new Error('DB down'))

    const res = await GET()
    expect(res.status).toBe(500)
  })
})
