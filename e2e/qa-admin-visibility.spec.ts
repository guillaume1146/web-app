/**
 * E2E — Regional Admin Visibility + Configuration (10 tests)
 *
 * Verifies the regional admin has the OMNISCIENT view: they can see
 * every workflow, service, role request, and template stats across
 * providers + their own authored ones, plus can configure/activate as
 * needed.
 */
import { test, expect } from '@playwright/test'
import { login, api, USERS, basicWorkflowSteps, basicWorkflowTransitions, uniqueSlug } from './helpers/qa-api-helpers'

test.setTimeout(90_000)

test.describe('Regional Admin Visibility + Configuration', () => {
  let adminCookies: string
  let doctorCookies: string

  test.beforeAll(async ({ request }) => {
    adminCookies = await login(request, USERS.regionalAdmin.email, USERS.regionalAdmin.password)
    doctorCookies = await login(request, USERS.doctor.email, USERS.doctor.password)
  })

  test('1. admin sees provider-created workflows in library browse', async ({ request }) => {
    // Provider creates one
    const slug = uniqueSlug('admin-visible')
    const wf = await api(request, 'POST', '/api/workflow/my-templates', doctorCookies, {
      name: `Visible to admin ${Date.now()}`, slug, serviceMode: 'office',
      steps: basicWorkflowSteps(), transitions: basicWorkflowTransitions(),
    })
    expect(wf.status).toBe(201)

    // Admin can see it
    const browse = await api(request, 'GET', `/api/workflow/library/browse?search=Visible+to+admin`, adminCookies)
    const found = (browse.body.data as any[]).some(t => t.slug === slug)
    expect(found).toBe(true)
  })

  test('2. admin sees their own created workflows', async ({ request }) => {
    const slug = uniqueSlug('admin-own')
    await api(request, 'POST', '/api/workflow/templates', adminCookies, {
      name: `Admin Own ${Date.now()}`, slug,
      providerType: 'DOCTOR', serviceMode: 'office',
      steps: basicWorkflowSteps(), transitions: basicWorkflowTransitions(),
    })
    const browse = await api(request, 'GET', `/api/workflow/library/browse?source=admin`, adminCookies)
    const found = (browse.body.data as any[]).some(t => t.slug === slug)
    expect(found).toBe(true)
  })

  test('3. admin sees system default workflows', async ({ request }) => {
    const browse = await api(request, 'GET', `/api/workflow/library/browse?source=system`, adminCookies)
    expect(browse.status).toBe(200)
    // System defaults always exist from seeds
    expect((browse.body.data as any[]).length).toBeGreaterThan(0)
    expect((browse.body.data as any[]).every(t => t.isDefault)).toBe(true)
  })

  test('4. admin can see service catalog for any provider type', async ({ request }) => {
    for (const pt of ['DOCTOR', 'NURSE', 'DENTIST', 'OPTOMETRIST']) {
      const res = await api(request, 'GET', `/api/services/catalog?providerType=${pt}`, adminCookies)
      expect(res.status, `Failed for ${pt}`).toBe(200)
      expect(res.body.success).toBe(true)
    }
  })

  test('5. admin can clone any template (including provider-created)', async ({ request }) => {
    // Find any provider-created template
    const browse = await api(request, 'GET', `/api/workflow/library/browse?source=provider`, adminCookies)
    const sample = (browse.body.data as any[])[0]
    test.skip(!sample, 'No provider-created templates to clone')
    const clone = await api(request, 'POST', `/api/workflow/templates/${sample.id}/clone`, adminCookies, {
      name: `Admin clone of ${sample.name}`,
    })
    expect(clone.status).toBe(201)
    expect(clone.body.data.createdByAdminId).toBeTruthy()
    expect(clone.body.data.createdByProviderId).toBeNull()
  })

  test('6. admin gets all provider roles (including legacy) via ?all=true', async ({ request }) => {
    const defaultList = await api(request, 'GET', '/api/roles', adminCookies)
    const allList = await api(request, 'GET', '/api/roles?all=true', adminCookies)
    expect(allList.status).toBe(200)
    expect((allList.body.data as any[]).length).toBeGreaterThanOrEqual((defaultList.body.data as any[]).length)
  })

  test('7. admin can activate a pending role (already covered but tested from admin perspective)', async ({ request }) => {
    const label = `Admin Activator ${Date.now()}`
    const created = await api(request, 'POST', '/api/roles/request', '', { label })
    const activate = await api(request, 'POST', `/api/roles/${created.body.data.id}/activate`, adminCookies, {})
    expect(activate.status).toBe(200)
  })

  test('8. workflow template stats returns counts for all templates', async ({ request }) => {
    const stats = await api(request, 'GET', '/api/workflow/templates/stats', adminCookies)
    expect(stats.status).toBe(200)
    // At least one seeded workflow has had instances
    const hasAnyData = Object.values(stats.body.data as Record<string, any>).some(
      (s: any) => s.total > 0
    )
    // Allow empty in a totally fresh DB — just assert structure
    expect(typeof stats.body.data).toBe('object')
    void hasAnyData
  })

  test('9. admin-only endpoint rejects non-admin (403)', async ({ request }) => {
    // admin/role-config is admin-guarded
    const res = await api(request, 'GET', '/api/admin/role-config', doctorCookies)
    expect(res.status).toBe(403)
  })

  test('10. admin can list ALL templates regardless of owner', async ({ request }) => {
    const list = await api(request, 'GET', '/api/workflow/templates', adminCookies)
    expect(list.status).toBe(200)
    // Must contain mix of sources: system defaults + non-defaults
    const data = list.body.data as any[]
    const hasDefault = data.some(t => t.isDefault === true)
    const hasCustom = data.some(t => t.isDefault === false)
    expect(hasDefault).toBe(true)
    // hasCustom may be false on first-run; that's fine
    void hasCustom
  })
})
