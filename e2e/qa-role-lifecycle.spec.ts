/**
 * E2E — Provider Role Lifecycle (10 tests)
 *
 * Verifies the dynamic-roles flow: anyone at signup can request a new
 * ProviderRole; it lands in pending state; a regional admin approves;
 * the role becomes usable for workflows + services + public listings.
 */
import { test, expect } from '@playwright/test'
import { login, api, USERS } from './helpers/qa-api-helpers'

test.setTimeout(90_000)

const now = () => Date.now() + Math.floor(Math.random() * 1000)

test.describe('Provider Role Lifecycle', () => {
  let adminCookies: string
  let doctorCookies: string

  test.beforeAll(async ({ request }) => {
    adminCookies = await login(request, USERS.regionalAdmin.email, USERS.regionalAdmin.password)
    doctorCookies = await login(request, USERS.doctor.email, USERS.doctor.password)
  })

  test('1. public can request a new provider role (no auth)', async ({ request }) => {
    const res = await api(request, 'POST', '/api/roles/request', '', {
      label: `Audiologist ${now()}`,
      description: 'Hearing care specialist',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.isActive).toBe(false)
  })

  test('2. requested role gets canonical code (UPPER_SNAKE_CASE)', async ({ request }) => {
    const label = `Osteopath ${now()}`
    const res = await api(request, 'POST', '/api/roles/request', '', { label })
    expect(res.status).toBe(201)
    expect(res.body.data.code).toMatch(/^OSTEOPATH_\d+$/)
  })

  test('3. requested role gets url-safe slug', async ({ request }) => {
    const label = `Chiropractor Expert ${now()}`
    const res = await api(request, 'POST', '/api/roles/request', '', { label })
    expect(res.body.data.slug).toMatch(/^chiropractor-expert-\d+$/)
  })

  test('4. label shorter than 3 chars is rejected', async ({ request }) => {
    const res = await api(request, 'POST', '/api/roles/request', '', { label: 'ab' })
    expect(res.status).toBe(400)
  })

  test('5. empty label is rejected', async ({ request }) => {
    const res = await api(request, 'POST', '/api/roles/request', '', { label: '' })
    expect(res.status).toBe(400)
  })

  test('6. duplicate label is rejected (409)', async ({ request }) => {
    const label = `Homeopath ${now()}`
    const first = await api(request, 'POST', '/api/roles/request', '', { label })
    expect(first.status).toBe(201)
    const second = await api(request, 'POST', '/api/roles/request', '', { label })
    expect(second.status).toBe(409)
  })

  test('7. pending role does NOT appear in public /api/roles list (isActive: false filter)', async ({ request }) => {
    const label = `Acupuncturist ${now()}`
    const created = await api(request, 'POST', '/api/roles/request', '', { label })
    const code = created.body.data.code

    const list = await api(request, 'GET', '/api/roles', '')
    const found = (list.body.data as Array<{ code: string }>).some(r => r.code === code)
    expect(found).toBe(false)
  })

  test('8. admin can activate a pending role', async ({ request }) => {
    const label = `Podiatrist ${now()}`
    const created = await api(request, 'POST', '/api/roles/request', '', { label })
    const roleId = created.body.data.id

    const activate = await api(request, 'POST', `/api/roles/${roleId}/activate`, adminCookies, {})
    expect(activate.status).toBe(200)
    expect(activate.body.data.isActive).toBe(true)
    expect(activate.body.data.createdByAdminId).toBeTruthy()
  })

  test('9. non-admin CANNOT activate a role', async ({ request }) => {
    const label = `Kinesiologist ${now()}`
    const created = await api(request, 'POST', '/api/roles/request', '', { label })
    const roleId = created.body.data.id

    const activate = await api(request, 'POST', `/api/roles/${roleId}/activate`, doctorCookies, {})
    expect(activate.status).toBe(403)
  })

  test('10. activated role appears in public /api/roles and can target workflows', async ({ request }) => {
    const label = `Reflexologist ${now()}`
    const created = await api(request, 'POST', '/api/roles/request', '', { label })
    const { id: roleId, code } = created.body.data

    await api(request, 'POST', `/api/roles/${roleId}/activate`, adminCookies, {})

    // Public list now includes the role
    const list = await api(request, 'GET', '/api/roles', '')
    const visible = (list.body.data as Array<{ code: string }>).some(r => r.code === code)
    expect(visible).toBe(true)

    // Can use it as providerType for a workflow
    const wf = await api(request, 'POST', '/api/workflow/templates', adminCookies, {
      name: `Workflow for ${code}`, slug: `wf-${code.toLowerCase()}-${now()}`,
      providerType: code, serviceMode: 'office',
      steps: [
        { order: 1, statusCode: 'pending', label: 'Pending',
          actionsForPatient: [], actionsForProvider: [{ action: 'accept', label: 'A', targetStatus: 'done', style: 'primary' }],
          flags: {}, notifyPatient: null, notifyProvider: null },
        { order: 2, statusCode: 'done', label: 'Done',
          actionsForPatient: [], actionsForProvider: [], flags: {},
          notifyPatient: null, notifyProvider: null },
      ],
      transitions: [{ from: 'pending', to: 'done', action: 'accept', allowedRoles: ['provider'] }],
    })
    expect(wf.status).toBe(201)
  })
})
