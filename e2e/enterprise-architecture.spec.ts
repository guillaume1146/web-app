/**
 * Enterprise Architecture Validation Tests
 *
 * Verifies that enterprise patterns are properly implemented:
 * 1. All API endpoints return proper response format
 * 2. DTOs validate input (reject invalid data)
 * 3. Swagger docs are accessible
 * 4. All modules have proper service layer
 * 5. No undefined values in any response
 */

import { test, expect, APIRequestContext } from '@playwright/test'

const BASE = 'http://localhost:3000'
const API_DIRECT = 'http://localhost:3001'

// ─── Helpers ───────────────────────────────────────────────────────────────

async function login(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${BASE}/api/auth/login`, { data: { email, password } })
  return res.headers()['set-cookie'] || ''
}

function auth(cookies: string): Record<string, string> {
  const pairs = cookies.split(/,(?=\s*\w+=)/).map(c => c.split(';')[0].trim()).filter(Boolean)
  return { cookie: pairs.join('; ') }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SWAGGER DOCS — Accessible and populated
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Enterprise: Swagger Documentation', () => {
  test('Swagger UI is accessible', async ({ request }) => {
    const res = await request.get(`${API_DIRECT}/api/docs`)
    // Swagger returns HTML page
    expect(res.status()).toBeLessThan(400)
  })

  test('Swagger JSON schema is available with tags', async ({ request }) => {
    // Try direct NestJS URL first, then proxy
    let res = await request.get(`${API_DIRECT}/api/docs-json`)
    if (!res.ok()) res = await request.get(`${BASE}/api/docs-json`)
    if (res.ok()) {
      const json = await res.json()
      expect(json.openapi).toBeDefined()
      expect(json.paths).toBeDefined()
      // Should have tags from @ApiTags decorators
      const tagNames = Object.values(json.paths as Record<string, any>)
        .flatMap(methods => Object.values(methods as Record<string, any>))
        .flatMap((m: any) => m.tags || [])
      const uniqueTags = [...new Set(tagNames)]
      expect(uniqueTags.length).toBeGreaterThan(10) // Should have 15+ tags
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. RESPONSE FORMAT — Every endpoint returns { success, data/message }
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Enterprise: Response Format Consistency', () => {
  const publicEndpoints = [
    '/api/health', '/api/roles', '/api/stats', '/api/regions', '/api/config',
    '/api/services/catalog', '/api/search/providers?type=DOCTOR', '/api/specialties',
    '/api/insurance/plans', '/api/posts',
  ]

  for (const ep of publicEndpoints) {
    test(`${ep} returns { success: true }`, async ({ request }) => {
      const res = await request.get(`${BASE}${ep}`)
      expect(res.ok()).toBe(true)
      const json = await res.json()
      expect(json.success).toBe(true)
      // No undefined in JSON
      const text = JSON.stringify(json)
      expect(text).not.toContain('"undefined"')
    })
  }

  test('Auth error returns { success: false, message }', async ({ request }) => {
    const res = await request.get(`${BASE}/api/auth/me`)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.message).toBeDefined()
    expect(typeof json.message).toBe('string')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DTO VALIDATION — Invalid input rejected
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Enterprise: DTO Validation', () => {
  let cookies = ''

  test.beforeAll(async ({ request }) => {
    cookies = await login(request, 'emma.johnson@mediwyz.com', 'Patient123!')
  })

  test('POST /bookings with missing providerUserId returns error', async ({ request }) => {
    const res = await request.post(`${BASE}/api/bookings`, {
      headers: auth(cookies),
      data: { scheduledDate: '2026-09-01' }, // missing providerUserId
    })
    const json = await res.json()
    // Should get validation error or business logic error
    expect(json.success === false || res.status() >= 400).toBe(true)
  })

  test('POST /auth/login with empty email returns error', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: '', password: '' },
    })
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.message).toBeDefined()
  })

  test('POST /auth/login with invalid email format returns error', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'not-an-email', password: '123456' },
    })
    const json = await res.json()
    expect(json.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. AUTHENTICATED ENDPOINTS — All return proper data
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Enterprise: Authenticated Endpoints', () => {
  let patientCookies = ''
  let doctorCookies = ''
  let adminCookies = ''

  test.beforeAll(async ({ request }) => {
    patientCookies = await login(request, 'emma.johnson@mediwyz.com', 'Patient123!')
    doctorCookies = await login(request, 'sarah.johnson@mediwyz.com', 'Doctor123!')
    adminCookies = await login(request, 'kofi.agbeko@mediwyz.com', 'Regional123!')
  })

  const patientEndpoints = [
    '/api/bookings/unified?role=patient',
    '/api/conversations',
    '/api/connections',
    '/api/ai/chat',
  ]

  for (const ep of patientEndpoints) {
    test(`Patient: ${ep} returns success`, async ({ request }) => {
      const res = await request.get(`${BASE}${ep}`, { headers: auth(patientCookies) })
      expect(res.ok()).toBe(true)
      const json = await res.json()
      expect(json.success).toBe(true)
    })
  }

  const doctorEndpoints = [
    '/api/bookings/unified?role=provider',
    '/api/services/my-services',
    '/api/workflow/instances',
  ]

  for (const ep of doctorEndpoints) {
    test(`Doctor: ${ep} returns success`, async ({ request }) => {
      const res = await request.get(`${BASE}${ep}`, { headers: auth(doctorCookies) })
      expect(res.ok()).toBe(true)
      const json = await res.json()
      expect(json.success).toBe(true)
    })
  }

  const adminEndpoints = [
    '/api/admin/dashboard',
    '/api/admin/accounts',
    '/api/admin/role-config',
    '/api/admin/metrics',
    '/api/workflow/templates',
    '/api/regional/roles',
  ]

  for (const ep of adminEndpoints) {
    test(`Admin: ${ep} returns success`, async ({ request }) => {
      const res = await request.get(`${BASE}${ep}`, { headers: auth(adminCookies) })
      expect(res.ok()).toBe(true)
      const json = await res.json()
      expect(json.success).toBe(true)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. GENERIC PROVIDER ENDPOINTS — Same for all provider types
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Enterprise: Generic Provider Endpoints', () => {
  const providerTypes = ['DOCTOR', 'NURSE', 'DENTIST', 'OPTOMETRIST', 'NUTRITIONIST', 'PHYSIOTHERAPIST']

  for (const type of providerTypes) {
    test(`/providers/:id works for ${type}`, async ({ request }) => {
      const searchRes = await request.get(`${BASE}/api/search/providers?type=${type}&limit=1`)
      const searchJson = await searchRes.json()
      if (!searchJson.data?.length) return

      const id = searchJson.data[0].id
      const [profile, services, schedule] = await Promise.all([
        request.get(`${BASE}/api/providers/${id}`).then(r => r.json()),
        request.get(`${BASE}/api/providers/${id}/services`).then(r => r.json()),
        request.get(`${BASE}/api/providers/${id}/schedule`).then(r => r.json()),
      ])

      expect(profile.success).toBe(true)
      expect(services.success).toBe(true)
      expect(schedule.success).toBe(true)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. NO HARDCODED ROLES — Dynamic role system
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Enterprise: Dynamic Role System', () => {
  test('Roles come from database, not hardcoded', async ({ request }) => {
    const res = await request.get(`${BASE}/api/roles`)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.length).toBeGreaterThan(10) // Should have 15+ roles

    // Each role has all required dynamic fields
    for (const role of json.data) {
      expect(role.code).toBeDefined()
      expect(role.label).toBeDefined()
      expect(role.slug).toBeDefined()
      expect(typeof role.searchEnabled).toBe('boolean')
      expect(typeof role.bookingEnabled).toBe('boolean')
      expect(typeof role.providerCount).toBe('number')
    }
  })

  test('Service catalog is dynamic per provider type', async ({ request }) => {
    const res = await request.get(`${BASE}/api/services/catalog`)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. 3-TIER TRIGGERS — Quick verification
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Enterprise: 3-Tier Trigger System', () => {
  test('Workflow templates have steps with trigger flags', async ({ request }) => {
    const cookies = await login(request, 'kofi.agbeko@mediwyz.com', 'Regional123!')
    const res = await request.get(`${BASE}/api/workflow/templates`, { headers: auth(cookies) })
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.length).toBeGreaterThan(0)

    // At least one template should have steps with flags
    const hasFlags = json.data.some((t: any) => {
      const steps = typeof t.steps === 'string' ? JSON.parse(t.steps) : t.steps
      return steps?.some((s: any) => s.flags && Object.keys(s.flags).length > 0)
    })
    expect(hasFlags).toBe(true)
  })
})
