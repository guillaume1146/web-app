import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing routes
vi.mock('@/lib/db', () => ({
  default: {
    patientProfile: { findUnique: vi.fn() },
    doctorProfile: { findUnique: vi.fn(), findFirst: vi.fn() },
    nurseProfile: { findUnique: vi.fn(), findFirst: vi.fn() },
    nannyProfile: { findUnique: vi.fn(), findFirst: vi.fn() },
    labTechProfile: { findUnique: vi.fn(), findFirst: vi.fn() },
    emergencyWorkerProfile: { findMany: vi.fn() },
    emergencyBooking: { create: vi.fn() },
    appointment: { create: vi.fn() },
    nurseBooking: { create: vi.fn() },
    childcareBooking: { create: vi.fn() },
    labTestBooking: { create: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/auth/validate', () => ({
  validateRequest: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitPublic: vi.fn(() => null),
}))

vi.mock('@/lib/notifications', () => ({
  createNotification: vi.fn(),
}))

vi.mock('@/lib/booking/validate-availability', () => ({
  validateSlotAvailability: vi.fn(() => ({ available: true })),
}))

vi.mock('@/lib/booking/check-balance', () => ({
  checkPatientBalance: vi.fn(() => ({ sufficient: true, balance: 5000 })),
  checkBookingCost: vi.fn(() => ({
    coveredBySubscription: false,
    discount: 0,
    discountPercent: 0,
    adjustedFee: 500,
    sufficient: true,
    balance: 5000,
    isCorporate: false,
    message: 'Full price applies.',
  })),
}))

vi.mock('@/lib/booking-actions', () => ({
  acceptBooking: vi.fn(() => ({ status: 'accepted' })),
  denyBooking: vi.fn(),
  cancelBooking: vi.fn(() => ({ status: 'cancelled' })),
}))

vi.mock('@/lib/validations/api', () => ({
  createDoctorBookingSchema: {
    safeParse: vi.fn((data: unknown) => ({
      success: true,
      data,
    })),
  },
  createNurseBookingSchema: {
    safeParse: vi.fn((data: unknown) => ({
      success: true,
      data,
    })),
  },
  createNannyBookingSchema: {
    safeParse: vi.fn((data: unknown) => ({
      success: true,
      data,
    })),
  },
  createLabTestBookingSchema: {
    safeParse: vi.fn((data: unknown) => ({
      success: true,
      data,
    })),
  },
  createEmergencyBookingSchema: {
    safeParse: vi.fn((data: unknown) => ({
      success: true,
      data,
    })),
  },
  bookingActionSchema: {
    safeParse: vi.fn((data: unknown) => ({
      success: true,
      data,
    })),
  },
}))

import { POST as postDoctorBooking } from '../bookings/doctor/route'
import { POST as postNurseBooking } from '../bookings/nurse/route'
import { POST as postNannyBooking } from '../bookings/nanny/route'
import { POST as postLabTestBooking } from '../bookings/lab-test/route'
import { POST as postEmergencyBooking } from '../bookings/emergency/route'
import { PATCH as patchDoctorBookingAction } from '../bookings/doctor/[id]/route'
import { PATCH as patchNurseBookingAction } from '../bookings/nurse/[id]/route'
import { PATCH as patchNannyBookingAction } from '../bookings/nanny/[id]/route'
import { PATCH as patchLabTestBookingAction } from '../bookings/lab-test/[id]/route'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { NextRequest } from 'next/server'

function createPostRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createPatchRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) })

const doctorBookingData = {
  doctorId: 'doc-profile-1',
  consultationType: 'video',
  scheduledDate: '2026-04-01',
  scheduledTime: '10:00',
  reason: 'Checkup',
  notes: '',
  duration: 30,
}

const nurseBookingData = {
  nurseId: 'nurse-profile-1',
  consultationType: 'home_visit',
  scheduledDate: '2026-04-01',
  scheduledTime: '14:00',
  reason: 'Wound care',
  notes: '',
  duration: 60,
}

const nannyBookingData = {
  nannyId: 'nanny-profile-1',
  consultationType: 'in_person',
  scheduledDate: '2026-04-01',
  scheduledTime: '09:00',
  reason: 'Childcare',
  notes: '',
  duration: 120,
  children: [],
}

const labTestBookingData = {
  labTechId: 'lab-profile-1',
  testName: 'Complete Blood Count',
  scheduledDate: '2026-04-01',
  scheduledTime: '08:00',
  sampleType: 'blood',
  notes: '',
  price: 500,
}

const emergencyBookingData = {
  emergencyType: 'Cardiac',
  location: 'Port Louis Central',
  contactNumber: '+230 5777 8888',
  notes: 'Chest pain',
  priority: 'high',
}

describe('POST /api/bookings/doctor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await postDoctorBooking(createPostRequest('/api/bookings/doctor', doctorBookingData))
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('returns 201 with valid data', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'patient-user-1', userType: 'patient', email: 'p@example.com' })
    vi.mocked(prisma.patientProfile.findUnique).mockResolvedValue({ id: 'pat-1' } as never)
    vi.mocked(prisma.doctorProfile.findUnique).mockResolvedValue({
      id: 'doc-profile-1', userId: 'doc-user-1', specialty: ['Cardiology'], location: 'Office',
      consultationFee: 500, videoConsultationFee: 400,
    } as never)
    vi.mocked(prisma.appointment.create).mockResolvedValue({
      id: 'apt-1', type: 'video', scheduledAt: new Date('2026-04-01T10:00:00'), status: 'pending',
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      firstName: 'John', lastName: 'Doe',
    } as never)

    const res = await postDoctorBooking(createPostRequest('/api/bookings/doctor', doctorBookingData))
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(data.booking).toBeDefined()
    expect(data.booking.status).toBe('pending')
  })
})

describe('POST /api/bookings/nurse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await postNurseBooking(createPostRequest('/api/bookings/nurse', nurseBookingData))
    expect(res.status).toBe(401)
  })

  it('returns success with valid data', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'patient-user-1', userType: 'patient', email: 'p@example.com' })
    vi.mocked(prisma.patientProfile.findUnique).mockResolvedValue({ id: 'pat-1' } as never)
    vi.mocked(prisma.nurseProfile.findUnique).mockResolvedValue({ id: 'nurse-profile-1', userId: 'nurse-user-1' } as never)
    vi.mocked(prisma.nurseBooking.create).mockResolvedValue({
      id: 'nb-1', type: 'home_visit', scheduledAt: new Date('2026-04-01T14:00:00'), status: 'pending',
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ firstName: 'John', lastName: 'Doe' } as never)

    const res = await postNurseBooking(createPostRequest('/api/bookings/nurse', nurseBookingData))
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(data.booking).toBeDefined()
  })
})

describe('POST /api/bookings/nanny', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await postNannyBooking(createPostRequest('/api/bookings/nanny', nannyBookingData))
    expect(res.status).toBe(401)
  })

  it('returns success with valid data', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'patient-user-1', userType: 'patient', email: 'p@example.com' })
    vi.mocked(prisma.patientProfile.findUnique).mockResolvedValue({ id: 'pat-1' } as never)
    vi.mocked(prisma.nannyProfile.findUnique).mockResolvedValue({ id: 'nanny-profile-1', userId: 'nanny-user-1' } as never)
    vi.mocked(prisma.childcareBooking.create).mockResolvedValue({
      id: 'cb-1', type: 'in_person', scheduledAt: new Date('2026-04-01T09:00:00'), status: 'pending',
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ firstName: 'John', lastName: 'Doe' } as never)

    const res = await postNannyBooking(createPostRequest('/api/bookings/nanny', nannyBookingData))
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(data.booking).toBeDefined()
  })
})

describe('POST /api/bookings/lab-test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await postLabTestBooking(createPostRequest('/api/bookings/lab-test', labTestBookingData))
    expect(res.status).toBe(401)
  })

  it('returns success with valid data', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'patient-user-1', userType: 'patient', email: 'p@example.com' })
    vi.mocked(prisma.patientProfile.findUnique).mockResolvedValue({ id: 'pat-1' } as never)
    vi.mocked(prisma.labTechProfile.findUnique).mockResolvedValue({ id: 'lab-profile-1', userId: 'lab-user-1' } as never)
    vi.mocked(prisma.labTestBooking.create).mockResolvedValue({
      id: 'ltb-1', testName: 'Complete Blood Count', scheduledAt: new Date('2026-04-01T08:00:00'), status: 'pending',
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ firstName: 'John', lastName: 'Doe' } as never)

    const res = await postLabTestBooking(createPostRequest('/api/bookings/lab-test', labTestBookingData))
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(data.booking).toBeDefined()
  })
})

describe('POST /api/bookings/emergency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await postEmergencyBooking(createPostRequest('/api/bookings/emergency', emergencyBookingData))
    expect(res.status).toBe(401)
  })

  it('returns success with valid data', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'patient-user-1', userType: 'patient', email: 'p@example.com' })
    vi.mocked(prisma.patientProfile.findUnique).mockResolvedValue({ id: 'pat-1' } as never)
    vi.mocked(prisma.emergencyBooking.create).mockResolvedValue({
      id: 'eb-1', emergencyType: 'Cardiac', status: 'pending', priority: 'high', createdAt: new Date(),
    } as never)
    vi.mocked(prisma.emergencyWorkerProfile.findMany).mockResolvedValue([
      { userId: 'ew-user-1' },
    ] as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ firstName: 'John', lastName: 'Doe' } as never)

    const res = await postEmergencyBooking(createPostRequest('/api/bookings/emergency', emergencyBookingData))
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(data.booking).toBeDefined()
    expect(data.booking.type).toBe('emergency')
  })
})

describe('PATCH /api/bookings/doctor/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await patchDoctorBookingAction(
      createPatchRequest('/api/bookings/doctor/booking-1', { action: 'accept' }),
      mockParams('booking-1')
    )
    expect(res.status).toBe(401)
  })

  it('returns success for accept action', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'doc-user-1', userType: 'doctor', email: 'd@example.com' })

    const res = await patchDoctorBookingAction(
      createPatchRequest('/api/bookings/doctor/booking-1', { action: 'accept' }),
      mockParams('booking-1')
    )
    const data = await res.json()

    expect(data.success).toBe(true)
  })
})

describe('PATCH /api/bookings/nurse/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await patchNurseBookingAction(
      createPatchRequest('/api/bookings/nurse/booking-1', { action: 'accept' }),
      mockParams('booking-1')
    )
    expect(res.status).toBe(401)
  })

  it('returns success for deny action', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'nurse-user-1', userType: 'nurse', email: 'n@example.com' })

    const res = await patchNurseBookingAction(
      createPatchRequest('/api/bookings/nurse/booking-1', { action: 'deny' }),
      mockParams('booking-1')
    )
    const data = await res.json()

    expect(data.success).toBe(true)
  })
})

describe('PATCH /api/bookings/nanny/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await patchNannyBookingAction(
      createPatchRequest('/api/bookings/nanny/booking-1', { action: 'accept' }),
      mockParams('booking-1')
    )
    expect(res.status).toBe(401)
  })
})

describe('PATCH /api/bookings/lab-test/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await patchLabTestBookingAction(
      createPatchRequest('/api/bookings/lab-test/booking-1', { action: 'accept' }),
      mockParams('booking-1')
    )
    expect(res.status).toBe(401)
  })
})
