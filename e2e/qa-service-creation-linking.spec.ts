/**
 * E2E — Service Creation + Workflow Linking (10 tests)
 *
 * Verifies both providers and admins can create services, that attribution
 * is correct, and that workflows linked to services resolve correctly via
 * the engine's cascade.
 */
import { test, expect } from '@playwright/test'
import { login, api, USERS, basicWorkflowSteps, basicWorkflowTransitions, uniqueSlug } from './helpers/qa-api-helpers'

test.setTimeout(90_000)

test.describe('Service Creation + Workflow Linking', () => {
  let doctorCookies: string
  let patientCookies: string
  let adminCookies: string

  test.beforeAll(async ({ request }) => {
    doctorCookies = await login(request, USERS.doctor.email, USERS.doctor.password)
    patientCookies = await login(request, USERS.patient.email, USERS.patient.password)
    adminCookies = await login(request, USERS.regionalAdmin.email, USERS.regionalAdmin.password)
  })

  test('1. provider creates a custom service with all fields', async ({ request }) => {
    const res = await api(request, 'POST', '/api/services/custom', doctorCookies, {
      name: `Advanced Test ${Date.now()}`,
      description: 'Test description',
      category: 'specialty',
      price: 750,
      duration: 45,
    })
    expect(res.status).toBe(201)
    expect(res.body.data.defaultPrice).toBe(750)
    expect(res.body.data.duration).toBe(45)
    expect(res.body.data.createdByProviderId).toBeTruthy()
    expect(res.body.data.isDefault).toBe(false)
  })

  test('2. created service auto-assigns to creator catalog', async ({ request }) => {
    const name = `Auto-Assign Test ${Date.now()}`
    const create = await api(request, 'POST', '/api/services/custom', doctorCookies, {
      name, description: 'Should be in my-services', category: 'test', price: 100,
    })
    expect(create.status).toBe(201)

    const myServices = await api(request, 'GET', '/api/services/my-services', doctorCookies)
    expect(myServices.status).toBe(200)
    const mine = (myServices.body.data as any[]).find(
      (c: any) => c.platformService?.serviceName === name,
    )
    expect(mine).toBeTruthy()
  })

  test('3. member (patient) cannot create a custom service (403)', async ({ request }) => {
    const res = await api(request, 'POST', '/api/services/custom', patientCookies, {
      name: 'Patient Service', description: '', category: 'test',
    })
    expect(res.status).toBe(403)
  })

  test('4. unauthenticated request is rejected (401)', async ({ request }) => {
    const res = await api(request, 'POST', '/api/services/custom', '', {
      name: 'No Auth', description: '', category: 'test',
    })
    expect(res.status).toBe(401)
  })

  test('5. catalog endpoint shows provider-created services', async ({ request }) => {
    const name = `Catalog Visible ${Date.now()}`
    await api(request, 'POST', '/api/services/custom', doctorCookies, {
      name, description: '', category: 'test', price: 200,
    })
    const catalog = await api(request, 'GET', '/api/services/catalog?providerType=DOCTOR', doctorCookies)
    expect(catalog.status).toBe(200)
    const found = (catalog.body.data as Array<{ services: Array<{ serviceName: string }> }>)
      .some(g => g.services.some(s => s.serviceName === name))
    expect(found).toBe(true)
  })

  test('6. workflow links to a specific service', async ({ request }) => {
    // Create a service first
    const svc = await api(request, 'POST', '/api/services/custom', doctorCookies, {
      name: `Link Target ${Date.now()}`, description: '', category: 'test', price: 300,
    })
    expect(svc.status).toBe(201)

    // Create workflow linked to it
    const wf = await api(request, 'POST', '/api/workflow/my-templates', doctorCookies, {
      name: 'Linked Workflow', slug: uniqueSlug('linked-wf'),
      serviceMode: 'office',
      platformServiceId: svc.body.data.id,
      steps: basicWorkflowSteps(), transitions: basicWorkflowTransitions(),
    })
    expect(wf.status).toBe(201)
    expect(wf.body.data.platformServiceId).toBe(svc.body.data.id)
  })

  test('7. library browse shows linked service on the card', async ({ request }) => {
    const svc = await api(request, 'POST', '/api/services/custom', doctorCookies, {
      name: `Browse Link ${Date.now()}`, description: '', category: 'test', price: 400,
    })
    const slug = uniqueSlug('browse-link')
    await api(request, 'POST', '/api/workflow/my-templates', doctorCookies, {
      name: 'Browse Link Workflow', slug, serviceMode: 'office',
      platformServiceId: svc.body.data.id,
      steps: basicWorkflowSteps(), transitions: basicWorkflowTransitions(),
    })
    const browse = await api(request, 'GET', `/api/workflow/library/browse?search=${encodeURIComponent('Browse Link')}`, doctorCookies)
    const found = (browse.body.data as any[]).find(t => t.slug === slug)
    expect(found).toBeTruthy()
    expect(found.linkedService?.id).toBe(svc.body.data.id)
  })

  test('8. patching workflow can update platformServiceId', async ({ request }) => {
    const svc1 = await api(request, 'POST', '/api/services/custom', doctorCookies, {
      name: `Svc1 ${Date.now()}`, description: '', category: 'test', price: 100,
    })
    const svc2 = await api(request, 'POST', '/api/services/custom', doctorCookies, {
      name: `Svc2 ${Date.now()}`, description: '', category: 'test', price: 200,
    })
    const wf = await api(request, 'POST', '/api/workflow/my-templates', doctorCookies, {
      name: 'Relink Test', slug: uniqueSlug('relink'),
      serviceMode: 'office',
      platformServiceId: svc1.body.data.id,
      steps: basicWorkflowSteps(), transitions: basicWorkflowTransitions(),
    })

    const patch = await api(request, 'PATCH', `/api/workflow/templates/${wf.body.data.id}`, doctorCookies, {
      platformServiceId: svc2.body.data.id,
    })
    expect(patch.status).toBe(200)
    expect(patch.body.data.platformServiceId).toBe(svc2.body.data.id)
  })

  test('9. regional admin can also create services', async ({ request }) => {
    const res = await api(request, 'POST', '/api/services/custom', adminCookies, {
      name: `Admin Service ${Date.now()}`, description: 'Created by admin', category: 'test', price: 500,
    })
    expect(res.status).toBe(201)
    expect(res.body.data.createdByProviderId).toBeTruthy()
  })

  test('10. catalog filter by providerType is case-insensitive', async ({ request }) => {
    const upper = await api(request, 'GET', '/api/services/catalog?providerType=DOCTOR', doctorCookies)
    const lower = await api(request, 'GET', '/api/services/catalog?providerType=doctor', doctorCookies)
    const mixed = await api(request, 'GET', '/api/services/catalog?providerType=Doctor', doctorCookies)
    expect(upper.status).toBe(200)
    expect(lower.status).toBe(200)
    expect(mixed.status).toBe(200)
    // All three should return non-empty grouped data for DOCTOR
    expect((upper.body.data as any[]).length).toBeGreaterThan(0)
    expect((lower.body.data as any[]).length).toBe((upper.body.data as any[]).length)
    expect((mixed.body.data as any[]).length).toBe((upper.body.data as any[]).length)
  })
})
