/**
 * Shared helpers for the QA deep-coverage E2E suites.
 *
 * These tests all hit the public API directly (no browser UI navigation)
 * so they're fast + deterministic. The helpers below just wrap
 * login/request with cookie-jar behaviour.
 */
import { APIRequestContext, expect } from '@playwright/test'

export const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

export const USERS = {
  patient: { email: 'emma.johnson@mediwyz.com', password: 'Patient123!' },
  doctor: { email: 'sarah.johnson@mediwyz.com', password: 'Doctor123!' },
  nurse: { email: 'priya.ramgoolam@mediwyz.com', password: 'Nurse123!' },
  regionalAdmin: { email: 'kofi.agbeko@mediwyz.com', password: 'Regional123!' },
} as const

/**
 * Cache login cookies by email to dodge the login rate-limit (30/min).
 * With `--workers=1`, every spec file runs in the same Node process, so
 * a module-level Map is shared across the whole suite — one real POST
 * per account, reused everywhere.
 */
const cookieCache = new Map<string, string>()

export async function login(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const cacheKey = `${email}:${password}`
  const cached = cookieCache.get(cacheKey)
  if (cached) return cached

  const res = await request.post(`${BASE}/api/auth/login`, { data: { email, password } })
  expect(res.ok(), `Login failed for ${email}: ${await res.text()}`).toBeTruthy()
  const cookies = (res.headers()['set-cookie'] || '')
    .split(/,(?=[^;]+=)/)
    .map(c => c.split(';')[0])
    .join('; ')
  cookieCache.set(cacheKey, cookies)
  return cookies
}

export async function api(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
  path: string,
  cookies: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; body: any }> {
  const opts: any = { headers: { Cookie: cookies, 'Content-Type': 'application/json' } }
  if (body) opts.data = body
  const res = await request.fetch(`${BASE}${path}`, { method, ...opts })
  return { status: res.status(), body: await res.json().catch(() => ({})) }
}

/** A simple 3-step workflow skeleton — pending → confirmed → completed + cancelled. */
export function basicWorkflowSteps() {
  return [
    {
      order: 1, statusCode: 'pending', label: 'Pending',
      actionsForPatient: [{ action: 'cancel', label: 'Cancel', targetStatus: 'cancelled', style: 'danger' }],
      actionsForProvider: [{ action: 'accept', label: 'Accept', targetStatus: 'confirmed', style: 'primary' }],
      flags: {},
      notifyPatient: null, notifyProvider: null,
    },
    {
      order: 2, statusCode: 'confirmed', label: 'Confirmed',
      actionsForPatient: [], actionsForProvider: [{ action: 'complete', label: 'Complete', targetStatus: 'completed', style: 'primary' }],
      flags: {},
      notifyPatient: null, notifyProvider: null,
    },
    {
      order: 3, statusCode: 'completed', label: 'Done',
      actionsForPatient: [], actionsForProvider: [],
      flags: {},
      notifyPatient: null, notifyProvider: null,
    },
    {
      order: 4, statusCode: 'cancelled', label: 'Cancelled',
      actionsForPatient: [], actionsForProvider: [],
      flags: {},
      notifyPatient: null, notifyProvider: null,
    },
  ]
}

export function basicWorkflowTransitions() {
  return [
    { from: 'pending', to: 'confirmed', action: 'accept', allowedRoles: ['provider'] },
    { from: 'pending', to: 'cancelled', action: 'cancel', allowedRoles: ['patient'] },
    { from: 'confirmed', to: 'completed', action: 'complete', allowedRoles: ['provider'] },
  ]
}

export function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}
