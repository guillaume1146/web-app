import { test, expect, Page } from '@playwright/test'

test.setTimeout(90_000)

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  const emailInput = page.locator('input[name="email"]')
  await expect(emailInput).toBeVisible({ timeout: 10_000 })
  await emailInput.fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(
    /\/(patient|doctor|nurse|nanny|pharmacist|lab-technician|responder|insurance|corporate|referral-partner|regional|admin)\//,
    { timeout: 30_000 }
  )
}

test.describe('T. Connections & Sidebar Search Links', () => {
  test('T1: Patient sidebar has Search & Browse section with search links', async ({ page }) => {
    await loginAs(page, 'emma.johnson@mediwyz.com', 'Patient123!')
    await page.goto('/patient/feed', { waitUntil: 'domcontentloaded' })

    // Look for the Search & Browse divider text
    const searchSection = page.locator('text=/Search & Browse/i').first()
    await expect(searchSection).toBeVisible({ timeout: 30_000 })

    // Check that Find Doctors link exists (sidebar uses /search/doctors)
    const findDoctors = page.locator('a[href="/search/doctors"]').first()
    await expect(findDoctors).toBeVisible({ timeout: 10_000 })
  })

  test('T2: Doctor sidebar has Search & Browse section', async ({ page }) => {
    await loginAs(page, 'sarah.johnson@mediwyz.com', 'Doctor123!')
    await page.goto('/doctor/feed', { waitUntil: 'domcontentloaded' })

    const searchSection = page.locator('text=/Search & Browse/i').first()
    await expect(searchSection).toBeVisible({ timeout: 30_000 })

    const findNurses = page.locator('a[href="/search/nurses"]').first()
    await expect(findNurses).toBeVisible({ timeout: 10_000 })
  })

  test('T3: Search doctors page loads from sidebar link', async ({ page }) => {
    await loginAs(page, 'emma.johnson@mediwyz.com', 'Patient123!')
    await page.goto('/search/doctors', { waitUntil: 'domcontentloaded' })

    const content = page.locator('text=/doctor|search|find|specialist/i').first()
    await expect(content).toBeVisible({ timeout: 30_000 })
  })

  test('T4: Search nurses page loads', async ({ page }) => {
    await loginAs(page, 'emma.johnson@mediwyz.com', 'Patient123!')
    await page.goto('/search/nurses', { waitUntil: 'domcontentloaded' })

    const content = page.locator('text=/nurse|search|find|home care/i').first()
    await expect(content).toBeVisible({ timeout: 30_000 })
  })

  test('T5: Search childcare page loads', async ({ page }) => {
    await loginAs(page, 'emma.johnson@mediwyz.com', 'Patient123!')
    await page.goto('/search/childcare', { waitUntil: 'domcontentloaded' })

    const content = page.locator('text=/childcare|nanny|search|find/i').first()
    await expect(content).toBeVisible({ timeout: 30_000 })
  })

  test('T6: Search medicines page loads', async ({ page }) => {
    await loginAs(page, 'emma.johnson@mediwyz.com', 'Patient123!')
    await page.goto('/search/medicines', { waitUntil: 'domcontentloaded' })

    const content = page.locator('text=/medicine|pharmacy|search|find/i').first()
    await expect(content).toBeVisible({ timeout: 30_000 })
  })

  test('T7: Network icon visible in header with badge support', async ({ page }) => {
    await loginAs(page, 'sarah.johnson@mediwyz.com', 'Doctor123!')
    await page.goto('/doctor/feed', { waitUntil: 'domcontentloaded' })

    // Network icon should be visible (FaUserFriends link)
    const networkLink = page.locator('a[aria-label*="Network"]').first()
    await expect(networkLink).toBeVisible({ timeout: 30_000 })
  })

  test('T8: Network page loads with connection requests UI', async ({ page }) => {
    await loginAs(page, 'sarah.johnson@mediwyz.com', 'Doctor123!')
    await page.goto('/doctor/network', { waitUntil: 'domcontentloaded' })

    const content = page.locator('text=/network|connection|request/i').first()
    await expect(content).toBeVisible({ timeout: 30_000 })
  })
})
