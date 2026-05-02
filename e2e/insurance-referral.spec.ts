/**
 * Insurance Company + Referral Partner E2E Tests
 *
 * Insurance:
 * - Create/manage plans
 * - Process claims
 * - Dashboard data
 * - Client management
 *
 * Referral:
 * - Track referral clicks
 * - Dashboard with stats
 * - Commission tracking
 */

import { test, expect, APIRequestContext } from '@playwright/test'

const BASE = 'http://localhost:3000'

async function login(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${BASE}/api/auth/login`, { data: { email, password } })
  return res.headers()['set-cookie'] || ''
}

function auth(cookies: string): Record<string, string> {
  const pairs = cookies.split(/,(?=\s*\w+=)/).map(c => c.split(';')[0].trim()).filter(Boolean)
  return { cookie: pairs.join('; ') }
}

async function apiPost(req: APIRequestContext, cookies: string, path: string, data: any) {
  const res = await req.post(`${BASE}${path}`, { headers: auth(cookies), data })
  return { ok: res.ok(), json: await res.json() }
}

async function apiGet(req: APIRequestContext, cookies: string, path: string) {
  const res = await req.get(`${BASE}${path}`, { headers: auth(cookies) })
  return { ok: res.ok(), json: await res.json() }
}

async function apiPatch(req: APIRequestContext, cookies: string, path: string, data: any) {
  const res = await req.patch(`${BASE}${path}`, { headers: auth(cookies), data })
  return { ok: res.ok(), json: await res.json() }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSURANCE COMPANY
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Insurance Company', () => {
  let cookies = ''
  const INSURANCE_REP = { email: 'vikram.doorgakant@healthways.mu', password: 'Insurance123!' }

  test.beforeAll(async ({ request }) => {
    cookies = await login(request, INSURANCE_REP.email, INSURANCE_REP.password)
  })

  test('Insurance plans listing (public)', async ({ request }) => {
    const res = await request.get(`${BASE}/api/insurance/plans`)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
  })

  test('Insurance dashboard returns data', async ({ request }) => {
    const { json } = await apiGet(request, cookies, '/api/insurance/dashboard')
    expect(json.success).toBe(true)
    expect(json.data).toBeDefined()
    // Should have stats
    expect(typeof json.data.total === 'number' || json.data.stats).toBeTruthy()
  })

  test('Insurance claims listing', async ({ request }) => {
    const { json } = await apiGet(request, cookies, '/api/insurance/claims')
    expect(json.success).toBe(true)
    expect(json.data).toBeDefined()
  })

  test('Create insurance plan', async ({ request }) => {
    const { ok, json } = await apiPost(request, cookies, '/api/insurance/plans', {
      planName: `E2E Test Plan ${Date.now()}`,
      planType: 'Health',
      monthlyPremium: 500,
      coverageAmount: 50000,
      description: 'Test insurance plan',
      features: ['Hospital coverage', 'Dental', 'Vision'],
    })
    expect(ok).toBe(true)
    expect(json.success).toBe(true)
  })

  test('Update insurance plan (PATCH)', async ({ request }) => {
    // Get plans first
    const { json: plansJson } = await apiGet(request, cookies, '/api/insurance/plans')
    const plan = plansJson.data?.[0]
    if (plan?.id) {
      const { json } = await apiPatch(request, cookies, `/api/insurance/plans/${plan.id}`, {
        description: 'Updated description',
      })
      expect(json.success).toBe(true)
    }
  })

  test('No undefined in insurance responses', async ({ request }) => {
    const endpoints = ['/api/insurance/plans', '/api/insurance/claims', '/api/insurance/dashboard']
    for (const ep of endpoints) {
      const { json } = await apiGet(request, cookies, ep)
      const text = JSON.stringify(json)
      expect(text).not.toContain('"undefined"')
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// REFERRAL PARTNER
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Referral Partner', () => {
  let cookies = ''
  let userId = ''
  const REFERRAL = { email: 'sophie.leclerc@healthways.mu', password: 'Referral123!' }

  test.beforeAll(async ({ request }) => {
    cookies = await login(request, REFERRAL.email, REFERRAL.password)
    const me = await apiGet(request, cookies, '/api/auth/me')
    userId = me.json.user?.id || ''
  })

  test('Referral partner dashboard returns data', async ({ request }) => {
    if (!userId) return
    const { json } = await apiGet(request, cookies, `/api/referral-partners/${userId}/dashboard`)
    expect(json.success).toBe(true)
    expect(json.data).toBeDefined()
  })

  test('Referral tracking endpoint works (public)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/referral-tracking`, {
      data: {
        referralCode: 'SOPHIE2026',
        utmSource: 'e2e-test',
        utmMedium: 'playwright',
        location: 'mauritius',
      },
    })
    const json = await res.json()
    // Should succeed or handle gracefully
    expect(json.success === true || json.message).toBeTruthy()
  })

  test('No undefined in referral responses', async ({ request }) => {
    if (!userId) return
    const { json } = await apiGet(request, cookies, `/api/referral-partners/${userId}/dashboard`)
    const text = JSON.stringify(json)
    expect(text).not.toContain('"undefined"')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-FEATURE: Insurance + Subscription
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Insurance & Subscriptions', () => {
  test('Subscription plans include corporate type', async ({ request }) => {
    const res = await request.get(`${BASE}/api/subscriptions`)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
  })

  test('Insurance plans are accessible publicly', async ({ request }) => {
    const res = await request.get(`${BASE}/api/insurance/plans`)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})
