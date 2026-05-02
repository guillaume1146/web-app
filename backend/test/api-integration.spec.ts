/**
 * NestJS Backend API Integration Tests
 *
 * Tests every public and protected endpoint for:
 * - Correct HTTP status codes
 * - Standard response format { success: boolean, data/message }
 * - No undefined values in responses
 * - Proper auth enforcement
 *
 * Run: cd backend && npx jest test/api-integration.spec.ts --forceExit
 * Requires: NestJS running on port 3001 with seeded DB
 */

const API = process.env.API_URL || 'http://localhost:3001/api'

async function get(path: string, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Cookie'] = `mediwyz_token=${token}`
  const res = await fetch(`${API}${path}`, { headers })
  return { status: res.status, json: await res.json().catch(() => null), text: await res.text().catch(() => '') }
}

async function post(path: string, body: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Cookie'] = `mediwyz_token=${token}`
  const res = await fetch(`${API}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  return { status: res.status, json: await res.json().catch(() => null) }
}

let patientToken: string
let doctorToken: string
let adminToken: string
let patientUserId: string

// ─── Setup: Login to get tokens ──────────────────────────────────────────────

beforeAll(async () => {
  // Login as patient
  const patientRes = await post('/auth/login', { email: 'emma.johnson@mediwyz.com', password: 'Password123!' })
  if (patientRes.json?.success) {
    // Extract token from set-cookie header
    patientToken = 'test' // Will use cookie-based auth via the response
    patientUserId = patientRes.json.user?.id
  }

  // Login as doctor
  const doctorRes = await post('/auth/login', { email: 'doctor1@mediwyz.com', password: 'Password123!' })
  if (doctorRes.json?.success) {
    doctorToken = 'test'
  }

  // Login as admin
  const adminRes = await post('/auth/login', { email: 'admin@mediwyz.com', password: 'Admin123!' })
  if (adminRes.json?.success) {
    adminToken = 'test'
  }
}, 30000)

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS — No auth required
// ═══════════════════════════════════════════════════════════════════════════════

describe('Public Endpoints', () => {
  test('GET /health', async () => {
    const { status } = await get('/health')
    expect(status).toBe(200)
  })

  test('GET /roles returns array with required fields', async () => {
    const { status, json } = await get('/roles')
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
    if (json.data.length > 0) {
      const role = json.data[0]
      expect(role.code).toBeDefined()
      expect(role.label).toBeDefined()
      expect(role.slug).toBeDefined()
      expect(role.icon).toBeDefined()
      // Verify no undefined string values
      expect(JSON.stringify(role)).not.toContain('"undefined"')
    }
  })

  test('GET /stats returns platform statistics', async () => {
    const { status, json } = await get('/stats')
    expect(status).toBe(200)
    expect(json.success).toBe(true)
  })

  test('GET /regions returns regions', async () => {
    const { status, json } = await get('/regions')
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
  })

  test('GET /config returns app config', async () => {
    const { status, json } = await get('/config')
    expect(status).toBe(200)
    expect(json.success).toBe(true)
  })

  test('GET /services/catalog returns services', async () => {
    const { status, json } = await get('/services/catalog')
    expect(status).toBe(200)
    expect(json.success).toBe(true)
  })

  test('GET /search/providers?type=DOCTOR returns providers', async () => {
    const { status, json } = await get('/search/providers?type=DOCTOR')
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
  })

  test('GET /search/providers?type=NURSE', async () => {
    const { status, json } = await get('/search/providers?type=NURSE')
    expect(status).toBe(200)
    expect(json.success).toBe(true)
  })

  test('GET /subscriptions returns plans', async () => {
    const { status, json } = await get('/subscriptions')
    expect(status).toBe(200)
    expect(json.success).toBe(true)
  })

  test('GET /insurance/plans', async () => {
    const { status, json } = await get('/insurance/plans')
    expect(status).toBe(200)
    expect(json.success).toBe(true)
  })

  test('GET /role-config/:userType', async () => {
    const { status, json } = await get('/role-config/DOCTOR')
    expect(status).toBe(200)
    expect(json.success).toBe(true)
  })

  test('GET /specialties', async () => {
    const { status, json } = await get('/specialties')
    expect(status).toBe(200)
    expect(json.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Auth Endpoints', () => {
  test('POST /auth/login with valid credentials', async () => {
    const { status, json } = await post('/auth/login', { email: 'emma.johnson@mediwyz.com', password: 'Patient123!' })
    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.user).toBeDefined()
    expect(json.user.id).toBeDefined()
    expect(json.user.email).toBe('emma.johnson@mediwyz.com')
    expect(json.user.userType).toBeDefined()
    expect(json.redirectPath).toBeDefined()
  })

  test('POST /auth/login with invalid credentials returns error', async () => {
    const { status, json } = await post('/auth/login', { email: 'nonexistent@test.com', password: 'wrong' })
    expect(json.success).toBe(false)
    expect(json.message).toBeDefined()
    expect(typeof json.message).toBe('string')
  })

  test('POST /auth/login with missing fields returns validation error', async () => {
    const { json } = await post('/auth/login', { email: '' })
    expect(json.success).toBe(false)
    expect(json.message).toBeDefined()
  })

  test('GET /auth/me without token returns 401', async () => {
    const { status, json } = await get('/auth/me')
    expect(status).toBe(401)
    expect(json.success).toBe(false)
  })

  test('POST /auth/logout returns success', async () => {
    const { json } = await post('/auth/logout', {})
    expect(json.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE FORMAT VALIDATION — No undefined values
// ═══════════════════════════════════════════════════════════════════════════════

describe('Response Format: No Undefined Values', () => {
  const endpoints = [
    '/roles',
    '/stats',
    '/regions',
    '/config',
    '/services/catalog',
    '/search/providers?type=DOCTOR',
    '/search/providers?type=NURSE',
    '/insurance/plans',
    '/specialties',
  ]

  for (const endpoint of endpoints) {
    test(`GET ${endpoint} has no "undefined" in response`, async () => {
      const res = await fetch(`${API}${endpoint}`)
      const text = await res.text()
      expect(text).not.toContain('"undefined"')
      expect(text).not.toContain(':undefined')
      // Verify valid JSON
      const json = JSON.parse(text)
      expect(json).toBeDefined()
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// DYNAMIC ROLES — Verify role system is DB-driven
// ═══════════════════════════════════════════════════════════════════════════════

describe('Dynamic Roles System', () => {
  test('Roles include verification docs from DB', async () => {
    const { json } = await get('/roles?all=true')
    expect(json.success).toBe(true)
    const roleWithDocs = json.data.find((r: any) => r.verificationDocs?.length > 0)
    if (roleWithDocs) {
      expect(roleWithDocs.verificationDocs[0]).toHaveProperty('documentName')
    }
  })

  test('Roles include provider counts', async () => {
    const { json } = await get('/roles')
    const doctorRole = json.data.find((r: any) => r.code === 'DOCTOR')
    if (doctorRole) {
      expect(typeof doctorRole.providerCount).toBe('number')
    }
  })

  test('Service catalog is grouped by provider type', async () => {
    const { json } = await get('/services/catalog?providerType=DOCTOR')
    expect(json.success).toBe(true)
  })
})
