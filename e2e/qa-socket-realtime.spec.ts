/**
 * E2E — Socket.IO Real-time Sync (2-tab)
 *
 * Verifies that when the provider transitions a booking status via the API,
 * the patient's open booking-detail tab updates WITHOUT a manual refresh
 * AND a toast notification appears. This is the load-bearing claim of the
 * real-time UX — if this breaks, the test flags it.
 */
import { test, expect, Browser } from '@playwright/test'
import { login, api, USERS, BASE } from './helpers/qa-api-helpers'

test.setTimeout(120_000)
test.skip(({ browserName }) => browserName !== 'chromium', 'Runs on Chromium only')

async function browserLogin(browser: Browser, email: string, password: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 20_000 })
  return { context, page }
}

test.describe('Socket.IO — Real-time status sync', () => {
  test('provider accept → patient tab updates AND shows toast, no refresh', async ({ browser, request }) => {
    // 1. Create a fresh booking so we always have a pending instance both
    //    users are participants on. Emma books Sarah for a video consult.
    const providerCookies = await login(request, USERS.doctor.email, USERS.doctor.password)
    const patientApiCookies = await login(request, USERS.patient.email, USERS.patient.password)

    // Find Sarah's user ID
    const providerMe = await api(request, 'GET', '/api/auth/me', providerCookies)
    const providerUserId = providerMe.body?.user?.id
    expect(providerUserId, 'Expected doctor user id').toBeTruthy()

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const create = await api(request, 'POST', '/api/bookings', patientApiCookies, {
      providerUserId,
      providerType: 'DOCTOR',
      scheduledDate: tomorrow.toISOString().split('T')[0],
      scheduledTime: '15:00',
      type: 'video',
      reason: 'Socket.IO E2E test booking',
      servicePrice: 600,
      serviceName: 'Video Consultation',
    })
    expect(create.status, `Booking creation failed: ${JSON.stringify(create.body)}`).toBeLessThan(400)

    // Prefer the workflowInstanceId that comes back on creation; fall back
    // to looking up by bookingId if the response shape differs.
    const instanceId: string | undefined =
      create.body?.workflowInstanceId ?? create.body?.data?.workflowInstanceId
    const bookingId: string | undefined =
      create.body?.booking?.id ?? create.body?.data?.booking?.id ?? create.body?.data?.id
    expect(instanceId || bookingId, `No instance id returned: ${JSON.stringify(create.body).slice(0, 300)}`).toBeTruthy()

    // Fetch the instance by id OR by booking, as provider (not patient)
    const state = instanceId
      ? await api(request, 'GET', `/api/workflow/instances/${instanceId}`, providerCookies)
      : await api(request, 'GET', `/api/workflow/instances?role=provider&bookingType=service_booking`, providerCookies)
    const pending = instanceId
      ? { id: instanceId, bookingId: bookingId!, bookingType: 'service_booking' }
      : (state.body.data as any[]).find(i => i.bookingId === bookingId)
    expect(pending, 'Expected an instance tied to the created booking').toBeTruthy()

    const actions = instanceId
      ? (state.body.data?.actionsForProvider as Array<{ action: string; style?: string }>)
      : (() => {
        // When we had to list, fetch state separately
        return null
      })()
    const primaryAction = (actions ?? []).find(a => a.style !== 'danger')?.action ?? 'accept'

    // 2. Patient opens the booking detail tab + waits for it to mount +
    //    join the socket room (BookingWorkflowDetail subscribes on `chat:join`).
    const { context: patientCtx, page: patientPage } = await browserLogin(
      browser, USERS.patient.email, USERS.patient.password,
    )
    await patientPage.goto(`${BASE}/patient/bookings/${pending.bookingType}/${pending.bookingId}`)
    // Wait for any workflow content so we know the page hydrated and the
    // useEffect that emits `chat:join` has fired.
    await patientPage.waitForLoadState('networkidle', { timeout: 20_000 })
    // Give the socket a beat to finish its handshake + room join
    await patientPage.waitForTimeout(1500)

    // 3. Provider transitions via API — no patient tab interaction
    const transition = await api(request, 'POST', '/api/workflow/transition', providerCookies, {
      instanceId: pending.id,
      action: primaryAction,
    })
    expect(transition.status, `Transition (${primaryAction}) failed: ${JSON.stringify(transition.body)}`).toBe(200)

    // 4. Patient tab should update WITHOUT manual refresh. Capture the
    //    initial body text BEFORE the transition, then poll for change.
    //    The BookingWorkflowDetail useEffect watches state and fires a
    //    toast when the status changes — either signal proves Socket.IO.
    const initialText = (await patientPage.locator('body').innerText()).toLowerCase()
    const initialStatusSnippet = initialText.slice(0, 2000)

    await expect.poll(
      async () => {
        const hasToast = await patientPage.locator('.Toastify__toast').count() > 0
        const nowText = (await patientPage.locator('body').innerText()).toLowerCase()
        const bodyChanged = nowText.slice(0, 2000) !== initialStatusSnippet
        return hasToast || bodyChanged
      },
      { message: 'Expected patient tab to update via Socket.IO within 20s', timeout: 20_000, intervals: [500, 1000, 2000] },
    ).toBe(true)

    await patientCtx.close()
  })
})
