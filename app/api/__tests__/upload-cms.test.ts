// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// The CMS upload route uses fs/promises and path which are Node.js-only.
// We need to mock them before the route module loads.
const mockWriteFile = vi.fn().mockResolvedValue(undefined)
const mockMkdir = vi.fn().mockResolvedValue(undefined)

vi.mock('fs/promises', () => ({
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
  default: { writeFile: mockWriteFile, mkdir: mockMkdir },
}))

vi.mock('@/lib/auth/validate', () => ({
  validateRequest: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitAuth: vi.fn(() => null),
}))

import { validateRequest } from '@/lib/auth/validate'
import { NextRequest } from 'next/server'
import { File as NodeFile } from 'node:buffer'

function createUploadRequest(fileName: string, type: string, content = 'fake-image-data') {
  // Use Node.js built-in File (from node:buffer) so it passes undici's webidl.is.File check
  const file = new NodeFile([content], fileName, { type })
  const fd = new FormData()
  fd.append('file', file as unknown as Blob)
  return new NextRequest('http://localhost:3000/api/upload/cms', {
    method: 'POST',
    body: fd,
  })
}

// Only import the route after mocks are set up
let POST: typeof import('../upload/cms/route').POST

describe('POST /api/upload/cms', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Dynamic import ensures mocks are in place
    const mod = await import('../upload/cms/route')
    POST = mod.POST
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await POST(createUploadRequest('test.jpg', 'image/jpeg'))

    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin user', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@ex.com' })

    const res = await POST(createUploadRequest('test.jpg', 'image/jpeg'))

    expect(res.status).toBe(403)
  })

  it('returns 400 for no file', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'admin', email: 'a@ex.com' })

    const req = new NextRequest('http://localhost:3000/api/upload/cms', {
      method: 'POST',
      body: new FormData(),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.message).toBe('No file provided')
  })

  it('returns 400 for disallowed file type', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'admin', email: 'a@ex.com' })

    const res = await POST(createUploadRequest('test.pdf', 'application/pdf'))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.message).toContain('not allowed')
  })

  it('successfully uploads image for admin', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'admin', email: 'a@ex.com' })

    const res = await POST(createUploadRequest('hero.jpg', 'image/jpeg'))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data.url).toMatch(/^\/uploads\/cms\//)
    expect(json.data.url).toMatch(/\.jpg$/)
    expect(mockMkdir).toHaveBeenCalled()
    expect(mockWriteFile).toHaveBeenCalled()
  })

  it('successfully uploads for regional-admin', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'regional-admin', email: 'r@ex.com' })

    const res = await POST(createUploadRequest('banner.png', 'image/png'))

    expect(res.status).toBe(201)
  })
})
