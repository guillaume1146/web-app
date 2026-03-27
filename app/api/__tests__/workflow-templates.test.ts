/**
 * Workflow Templates API Tests
 *
 * Tests: /api/workflow/templates, /api/workflow/my-templates, /api/regional/workflow-templates
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Mocks ──────────────────────────────────────────────────────────────────

const { mockTemplateRepo, mockPrisma } = vi.hoisted(() => ({
  mockTemplateRepo: {
    findTemplates: vi.fn(),
    findTemplateById: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deactivateTemplate: vi.fn(),
  },
  mockPrisma: {
    user: { findUnique: vi.fn() },
    regionalAdminProfile: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/db', () => ({ default: mockPrisma }))
vi.mock('@/lib/auth/validate', () => ({ validateRequest: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({
  rateLimitAuth: vi.fn(() => null),
  rateLimitPublic: vi.fn(() => null),
}))
vi.mock('@/lib/workflow', () => ({ templateRepo: mockTemplateRepo }))

import { validateRequest } from '@/lib/auth/validate'
const mockAuth = validateRequest as ReturnType<typeof vi.fn>

const validSteps = [
  { order: 1, statusCode: 'pending', label: 'Pending', actionsForPatient: [], actionsForProvider: [{ action: 'accept', label: 'Accept', targetStatus: 'confirmed', style: 'primary' }], flags: {} },
  { order: 2, statusCode: 'confirmed', label: 'Confirmed', actionsForPatient: [], actionsForProvider: [], flags: { triggers_payment: true } },
]

const validTransitions = [
  { from: 'pending', to: 'confirmed', action: 'accept', allowedRoles: ['provider'] },
]

const validBody = {
  name: 'Test Workflow',
  slug: 'test-workflow-slug',
  providerType: 'DOCTOR',
  serviceMode: 'office',
  steps: validSteps,
  transitions: validTransitions,
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/workflow/templates', () => {
  it('returns templates with filters', async () => {
    mockAuth.mockReturnValue({ sub: 'user-1' })
    mockTemplateRepo.findTemplates.mockResolvedValue([{ id: 'tpl-1', name: 'Doctor Office' }])

    const { GET } = await import('../workflow/templates/route')
    const req = new NextRequest('http://localhost:3000/api/workflow/templates?providerType=DOCTOR&serviceMode=office')
    const res = await GET(req)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
    expect(mockTemplateRepo.findTemplates).toHaveBeenCalledWith(expect.objectContaining({
      providerType: 'DOCTOR',
      serviceMode: 'office',
    }))
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockReturnValue(null)

    const { GET } = await import('../workflow/templates/route')
    const req = new NextRequest('http://localhost:3000/api/workflow/templates')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })
})

describe('POST /api/workflow/templates', () => {
  it('creates template for provider with auto-injected createdByProviderId', async () => {
    mockAuth.mockReturnValue({ sub: 'doc-1' })
    mockPrisma.user.findUnique.mockResolvedValue({ userType: 'DOCTOR' })
    mockTemplateRepo.createTemplate.mockResolvedValue({ id: 'new-tpl', ...validBody })

    const { POST } = await import('../workflow/templates/route')
    const req = new NextRequest('http://localhost:3000/api/workflow/templates', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.success).toBe(true)
    expect(mockTemplateRepo.createTemplate).toHaveBeenCalledWith(expect.objectContaining({
      createdByProviderId: 'doc-1',
      createdByAdminId: undefined,
    }))
  })

  it('creates template for REGIONAL_ADMIN with auto-injected createdByAdminId', async () => {
    mockAuth.mockReturnValue({ sub: 'admin-1' })
    mockPrisma.user.findUnique.mockResolvedValue({ userType: 'REGIONAL_ADMIN' })
    mockTemplateRepo.createTemplate.mockResolvedValue({ id: 'new-tpl', ...validBody })

    const { POST } = await import('../workflow/templates/route')
    const req = new NextRequest('http://localhost:3000/api/workflow/templates', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, regionCode: 'MU' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(201)
    expect(mockTemplateRepo.createTemplate).toHaveBeenCalledWith(expect.objectContaining({
      createdByAdminId: 'admin-1',
      createdByProviderId: undefined,
      regionCode: 'MU',
    }))
  })

  it('returns 400 for missing steps', async () => {
    mockAuth.mockReturnValue({ sub: 'doc-1' })

    const { POST } = await import('../workflow/templates/route')
    const req = new NextRequest('http://localhost:3000/api/workflow/templates', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, steps: [] }),
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 400 for missing name', async () => {
    mockAuth.mockReturnValue({ sub: 'doc-1' })

    const { POST } = await import('../workflow/templates/route')
    const req = new NextRequest('http://localhost:3000/api/workflow/templates', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, name: '' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockReturnValue(null)

    const { POST } = await import('../workflow/templates/route')
    const req = new NextRequest('http://localhost:3000/api/workflow/templates', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)

    expect(res.status).toBe(401)
  })
})

describe('GET /api/workflow/my-templates', () => {
  it('returns only provider own templates', async () => {
    mockAuth.mockReturnValue({ sub: 'doc-1' })
    mockTemplateRepo.findTemplates.mockResolvedValue([{ id: 'my-tpl', name: 'My Custom' }])

    const { GET } = await import('../workflow/my-templates/route')
    const req = new NextRequest('http://localhost:3000/api/workflow/my-templates')
    const res = await GET(req)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(mockTemplateRepo.findTemplates).toHaveBeenCalledWith(expect.objectContaining({
      createdByProviderId: 'doc-1',
    }))
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockReturnValue(null)

    const { GET } = await import('../workflow/my-templates/route')
    const req = new NextRequest('http://localhost:3000/api/workflow/my-templates')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })
})

describe('POST /api/workflow/my-templates', () => {
  it('creates provider template with auto-injected fields', async () => {
    mockAuth.mockReturnValue({ sub: 'doc-1' })
    mockPrisma.user.findUnique.mockResolvedValue({ userType: 'DOCTOR' })
    mockTemplateRepo.createTemplate.mockResolvedValue({ id: 'new-my-tpl' })

    const { POST } = await import('../workflow/my-templates/route')
    const req = new NextRequest('http://localhost:3000/api/workflow/my-templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'My Custom Workflow',
        slug: 'my-custom-slug',
        serviceMode: 'video',
        steps: validSteps,
        transitions: validTransitions,
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.success).toBe(true)
    expect(mockTemplateRepo.createTemplate).toHaveBeenCalledWith(expect.objectContaining({
      createdByProviderId: 'doc-1',
      providerType: 'DOCTOR',
    }))
  })
})

describe('GET /api/regional/workflow-templates', () => {
  it('returns admin templates filtered by createdByAdminId', async () => {
    mockAuth.mockReturnValue({ sub: 'admin-1' })
    mockTemplateRepo.findTemplates.mockResolvedValue([{ id: 'admin-tpl', name: 'Regional Default' }])

    const { GET } = await import('../regional/workflow-templates/route')
    const req = new NextRequest('http://localhost:3000/api/regional/workflow-templates')
    const res = await GET(req)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(mockTemplateRepo.findTemplates).toHaveBeenCalledWith(expect.objectContaining({
      createdByAdminId: 'admin-1',
    }))
  })

  it('supports providerType filter', async () => {
    mockAuth.mockReturnValue({ sub: 'admin-1' })
    mockTemplateRepo.findTemplates.mockResolvedValue([])

    const { GET } = await import('../regional/workflow-templates/route')
    const req = new NextRequest('http://localhost:3000/api/regional/workflow-templates?providerType=NURSE')
    const res = await GET(req)

    expect(mockTemplateRepo.findTemplates).toHaveBeenCalledWith(expect.objectContaining({
      providerType: 'NURSE',
    }))
  })
})

describe('POST /api/regional/workflow-templates', () => {
  it('creates regional template with auto-injected admin fields + regionCode', async () => {
    mockAuth.mockReturnValue({ sub: 'admin-1' })
    mockPrisma.user.findUnique.mockResolvedValue({ userType: 'REGIONAL_ADMIN' })
    mockPrisma.regionalAdminProfile.findUnique.mockResolvedValue({ region: 'Mauritius', countryCode: 'MU' })
    mockTemplateRepo.createTemplate.mockResolvedValue({ id: 'regional-tpl' })

    const { POST } = await import('../regional/workflow-templates/route')
    const req = new NextRequest('http://localhost:3000/api/regional/workflow-templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Regional Nurse Workflow',
        slug: 'regional-nurse-slug',
        providerType: 'NURSE',
        serviceMode: 'home',
        steps: validSteps,
        transitions: validTransitions,
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.success).toBe(true)
    expect(mockTemplateRepo.createTemplate).toHaveBeenCalledWith(expect.objectContaining({
      createdByAdminId: 'admin-1',
      regionCode: 'MU',
    }))
  })

  it('returns 403 for non-REGIONAL_ADMIN users', async () => {
    mockAuth.mockReturnValue({ sub: 'doc-1' })
    mockPrisma.user.findUnique.mockResolvedValue({ userType: 'DOCTOR' })

    const { POST } = await import('../regional/workflow-templates/route')
    const req = new NextRequest('http://localhost:3000/api/regional/workflow-templates', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)

    expect(res.status).toBe(403)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockReturnValue(null)

    const { POST } = await import('../regional/workflow-templates/route')
    const req = new NextRequest('http://localhost:3000/api/regional/workflow-templates', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)

    expect(res.status).toBe(401)
  })
})
