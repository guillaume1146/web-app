/**
 * E2E — Workflow + Status Creation (10 tests)
 *
 * Verifies providers and admins can both create workflows with custom
 * statuses, flags, and transitions. Focus on validation + persistence +
 * read-back through the library browse endpoint.
 */
import { test, expect } from '@playwright/test'
import { login, api, USERS, basicWorkflowSteps, basicWorkflowTransitions, uniqueSlug } from './helpers/qa-api-helpers'

test.setTimeout(90_000)

test.describe('Workflow + Status Creation', () => {
  let doctorCookies: string
  let adminCookies: string

  test.beforeAll(async ({ request }) => {
    doctorCookies = await login(request, USERS.doctor.email, USERS.doctor.password)
    adminCookies = await login(request, USERS.regionalAdmin.email, USERS.regionalAdmin.password)
  })

  test('1. provider creates a basic 4-step workflow', async ({ request }) => {
    const res = await api(request, 'POST', '/api/workflow/my-templates', doctorCookies, {
      name: `Test Basic ${Date.now()}`,
      slug: uniqueSlug('test-basic'),
      serviceMode: 'office',
      steps: basicWorkflowSteps(),
      transitions: basicWorkflowTransitions(),
    })
    expect(res.status).toBe(201)
    expect(res.body.data.createdByProviderId).toBeTruthy()
    expect((res.body.data.steps as any[]).length).toBe(4)
  })

  test('2. workflow persists custom status codes (not in the standard set)', async ({ request }) => {
    const slug = uniqueSlug('test-custom-status')
    const customSteps = basicWorkflowSteps()
    customSteps[1].statusCode = 'gravely_awaiting_quorum'
    customSteps[1].label = 'Awaiting Quorum'
    // Update transitions to match
    const transitions = [
      { from: 'pending', to: 'gravely_awaiting_quorum', action: 'accept', allowedRoles: ['provider'] },
      { from: 'gravely_awaiting_quorum', to: 'completed', action: 'complete', allowedRoles: ['provider'] },
      { from: 'pending', to: 'cancelled', action: 'cancel', allowedRoles: ['patient'] },
    ]
    // Fix the actions to target the new code
    customSteps[0].actionsForProvider[0].targetStatus = 'gravely_awaiting_quorum'
    customSteps[1].actionsForProvider[0].targetStatus = 'completed'

    const res = await api(request, 'POST', '/api/workflow/my-templates', doctorCookies, {
      name: 'Custom Status Test', slug, serviceMode: 'office',
      steps: customSteps, transitions,
    })
    expect(res.status).toBe(201)

    // Read back via library browse with containsStatus filter
    const browse = await api(
      request, 'GET',
      '/api/workflow/library/browse?containsStatus=gravely_awaiting_quorum',
      doctorCookies,
    )
    expect(browse.status).toBe(200)
    expect((browse.body.data as any[]).some(t => t.slug === slug)).toBe(true)
  })

  test('3. workflow with all trigger flags on one step persists correctly', async ({ request }) => {
    const steps = basicWorkflowSteps()
    steps[1].flags = {
      triggers_payment: true,
      triggers_conversation: true,
      triggers_video_call: true,
      triggers_review_request: true,
      requires_content: 'lab_result',
    }
    const res = await api(request, 'POST', '/api/workflow/my-templates', doctorCookies, {
      name: 'All Flags', slug: uniqueSlug('test-all-flags'),
      serviceMode: 'office', steps, transitions: basicWorkflowTransitions(),
    })
    expect(res.status).toBe(201)
    const savedFlags = (res.body.data.steps as any[])[1].flags
    expect(savedFlags.triggers_payment).toBe(true)
    expect(savedFlags.triggers_video_call).toBe(true)
    expect(savedFlags.requires_content).toBe('lab_result')
  })

  test('4. workflow with >10 steps saves without truncation', async ({ request }) => {
    const manySteps = Array.from({ length: 15 }, (_, i) => ({
      order: i + 1,
      statusCode: i === 0 ? 'pending' : i === 14 ? 'completed' : `step_${i}`,
      label: `Step ${i + 1}`,
      actionsForPatient: [] as any[],
      actionsForProvider: i < 14 ? [{ action: 'next', label: 'Next', targetStatus: i === 13 ? 'completed' : `step_${i + 1}`, style: 'primary' }] : [],
      flags: {}, notifyPatient: null, notifyProvider: null,
    }))
    const transitions = manySteps.slice(0, -1).map((s, i) => ({
      from: s.statusCode,
      to: i === manySteps.length - 2 ? 'completed' : manySteps[i + 1].statusCode,
      action: 'next',
      allowedRoles: ['provider'],
    }))
    const res = await api(request, 'POST', '/api/workflow/my-templates', doctorCookies, {
      name: '15-step workflow', slug: uniqueSlug('test-15step'),
      serviceMode: 'office', steps: manySteps, transitions,
    })
    expect(res.status).toBe(201)
    expect((res.body.data.steps as any[]).length).toBe(15)
  })

  test('5. duplicate slug is rejected', async ({ request }) => {
    const slug = uniqueSlug('test-dup')
    const first = await api(request, 'POST', '/api/workflow/my-templates', doctorCookies, {
      name: 'First', slug, serviceMode: 'office',
      steps: basicWorkflowSteps(), transitions: basicWorkflowTransitions(),
    })
    expect(first.status).toBe(201)

    const second = await api(request, 'POST', '/api/workflow/my-templates', doctorCookies, {
      name: 'Second', slug, serviceMode: 'office',
      steps: basicWorkflowSteps(), transitions: basicWorkflowTransitions(),
    })
    // Should fail — unique constraint
    expect(second.status).toBeGreaterThanOrEqual(400)
  })

  test('6. provider can read back their own templates', async ({ request }) => {
    const slug = uniqueSlug('my-tpl')
    await api(request, 'POST', '/api/workflow/my-templates', doctorCookies, {
      name: 'My Own', slug, serviceMode: 'office',
      steps: basicWorkflowSteps(), transitions: basicWorkflowTransitions(),
    })
    const res = await api(request, 'GET', '/api/workflow/my-templates', doctorCookies)
    expect(res.status).toBe(200)
    expect((res.body.data as any[]).some(t => t.slug === slug)).toBe(true)
  })

  test('7. regional admin can create a default workflow', async ({ request }) => {
    const res = await api(request, 'POST', '/api/workflow/templates', adminCookies, {
      name: 'Admin Default', slug: uniqueSlug('admin-default'),
      providerType: 'DOCTOR', serviceMode: 'office',
      steps: basicWorkflowSteps(), transitions: basicWorkflowTransitions(),
    })
    expect(res.status).toBe(201)
    expect(res.body.data.createdByAdminId).toBeTruthy()
    expect(res.body.data.createdByProviderId).toBeNull()
  })

  test('8. library browse filter by source=provider returns only provider-created', async ({ request }) => {
    const res = await api(request, 'GET', '/api/workflow/library/browse?source=provider', doctorCookies)
    expect(res.status).toBe(200)
    const allHaveProviderCreator = (res.body.data as any[]).every(
      t => t.creator?.kind === 'provider' || t.createdByProviderId
    )
    expect(allHaveProviderCreator).toBe(true)
  })

  test('9. library browse filter by providerType is case-insensitive', async ({ request }) => {
    const upper = await api(request, 'GET', '/api/workflow/library/browse?providerType=DOCTOR', doctorCookies)
    const lower = await api(request, 'GET', '/api/workflow/library/browse?providerType=doctor', doctorCookies)
    expect(upper.status).toBe(200)
    expect(lower.status).toBe(200)
    // Both should return the same count
    expect((upper.body.data as any[]).length).toBe((lower.body.data as any[]).length)
  })

  test('10. workflow template carries denormalized creator + linked service in browse', async ({ request }) => {
    const slug = uniqueSlug('denorm-test')
    await api(request, 'POST', '/api/workflow/my-templates', doctorCookies, {
      name: 'Denorm Test', slug, serviceMode: 'office',
      steps: basicWorkflowSteps(), transitions: basicWorkflowTransitions(),
    })
    const res = await api(request, 'GET', `/api/workflow/library/browse?search=Denorm`, doctorCookies)
    const found = (res.body.data as any[]).find(t => t.slug === slug)
    expect(found).toBeTruthy()
    expect(found.creator.kind).toBe('provider')
    expect(found.creator.user?.firstName).toBeTruthy()
    expect(found.statusCodes).toContain('pending')
    expect(found.statusCodes).toContain('completed')
  })
})
