/**
 * E2E Tests — Workflow Management, Inventory, Health Shop
 *
 * Tests that:
 * - All provider types can access their inventory page
 * - Providers can access their workflow management page
 * - Regional admins can access their workflow management page
 * - Health Shop page loads and shows items
 * - Provider services page loads
 */
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
    /\/(patient|doctor|nurse|nanny|pharmacist|lab-technician|responder|insurance|corporate|referral-partner|regional|admin|caregiver|physiotherapist|dentist|optometrist|nutritionist)\//,
    { timeout: 30_000 }
  )
}

// ─── Provider Inventory Access ───────────────────────────────────────────────

test.describe('Provider Inventory Pages', () => {
  const providerTests = [
    { name: 'Doctor', email: 'dr.raj.patel@mediwyz.com', password: 'Doctor123!', path: '/doctor/inventory' },
    { name: 'Nurse', email: 'priya.ramgoolam@mediwyz.com', password: 'Nurse123!', path: '/nurse/inventory' },
    { name: 'Nanny', email: 'anita.beeharry@mediwyz.com', password: 'Nanny123!', path: '/nanny/inventory' },
    { name: 'Pharmacist', email: 'rajesh.doorgakant@mediwyz.com', password: 'Pharma123!', path: '/pharmacist/inventory' },
    { name: 'Lab Tech', email: 'david.ahkee@mediwyz.com', password: 'Lab123!', path: '/lab-technician/inventory' },
    { name: 'Responder', email: 'kevin.sauteur@mediwyz.com', password: 'Responder123!', path: '/responder/inventory' },
    { name: 'Caregiver', email: 'caregiver.marie@mediwyz.com', password: 'Caregiver123!', path: '/caregiver/inventory' },
    { name: 'Physiotherapist', email: 'physio.jean@mediwyz.com', password: 'Physio123!', path: '/physiotherapist/inventory' },
    { name: 'Dentist', email: 'dentist.sara@mediwyz.com', password: 'Dentist123!', path: '/dentist/inventory' },
    { name: 'Optometrist', email: 'optom.alain@mediwyz.com', password: 'Optom123!', path: '/optometrist/inventory' },
    { name: 'Nutritionist', email: 'nutri.priya@mediwyz.com', password: 'Nutri123!', path: '/nutritionist/inventory' },
  ]

  for (const { name, email, password, path } of providerTests) {
    test(`${name} inventory page loads`, async ({ page }) => {
      await loginAs(page, email, password)
      await page.goto(path, { waitUntil: 'domcontentloaded' })

      // Should see inventory-related content (title, table, or add button)
      const content = page.locator('text=/inventory|my inventory|add item|no items|products/i').first()
      await expect(content).toBeVisible({ timeout: 30_000 })
    })
  }
})

// ─── Provider Workflow Pages ─────────────────────────────────────────────────

test.describe('Provider Workflow Pages', () => {
  test('Doctor workflows page loads', async ({ page }) => {
    await loginAs(page, 'dr.raj.patel@mediwyz.com', 'Doctor123!')
    await page.goto('/doctor/workflows', { waitUntil: 'domcontentloaded' })

    const content = page.locator('text=/workflow|template|create|no workflow/i').first()
    await expect(content).toBeVisible({ timeout: 30_000 })
  })

  test('Nurse workflows page loads', async ({ page }) => {
    await loginAs(page, 'priya.ramgoolam@mediwyz.com', 'Nurse123!')
    await page.goto('/nurse/workflows', { waitUntil: 'domcontentloaded' })

    const content = page.locator('text=/workflow|template|create|no workflow/i').first()
    await expect(content).toBeVisible({ timeout: 30_000 })
  })

  test('Dentist workflows page loads', async ({ page }) => {
    await loginAs(page, 'dentist.sara@mediwyz.com', 'Dentist123!')
    await page.goto('/dentist/workflows', { waitUntil: 'domcontentloaded' })

    const content = page.locator('text=/workflow|template|create|no workflow/i').first()
    await expect(content).toBeVisible({ timeout: 30_000 })
  })
})

// ─── Provider Services Pages ─────────────────────────────────────────────────

test.describe('Provider Services Pages', () => {
  test('Doctor services page loads', async ({ page }) => {
    await loginAs(page, 'dr.raj.patel@mediwyz.com', 'Doctor123!')
    await page.goto('/doctor/services', { waitUntil: 'domcontentloaded' })

    const content = page.locator('text=/service|catalog|my services|configure|price/i').first()
    await expect(content).toBeVisible({ timeout: 30_000 })
  })

  test('Pharmacist services page loads', async ({ page }) => {
    await loginAs(page, 'rajesh.doorgakant@mediwyz.com', 'Pharma123!')
    await page.goto('/pharmacist/services', { waitUntil: 'domcontentloaded' })

    const content = page.locator('text=/service|catalog|my services|configure|price/i').first()
    await expect(content).toBeVisible({ timeout: 30_000 })
  })
})

// ─── Regional Admin Workflow Management ──────────────────────────────────────

test.describe('Regional Admin Workflow Management', () => {
  test('Regional admin workflows page loads', async ({ page }) => {
    await loginAs(page, 'admin.mu@mediwyz.com', 'Regional123!')
    await page.goto('/regional/workflows', { waitUntil: 'domcontentloaded' })

    const content = page.locator('text=/workflow|template|create|manage/i').first()
    await expect(content).toBeVisible({ timeout: 30_000 })
  })

  test('Regional admin services page loads', async ({ page }) => {
    await loginAs(page, 'admin.mu@mediwyz.com', 'Regional123!')
    await page.goto('/regional/services', { waitUntil: 'domcontentloaded' })

    const content = page.locator('text=/service|group|catalog|subscription/i').first()
    await expect(content).toBeVisible({ timeout: 30_000 })
  })
})

// ─── Health Shop ─────────────────────────────────────────────────────────────

test.describe('Health Shop', () => {
  test('Health Shop page loads for unauthenticated users', async ({ page }) => {
    await page.goto('/search/health-shop', { waitUntil: 'domcontentloaded' })

    const content = page.locator('text=/health shop|shop|browse|products|items/i').first()
    await expect(content).toBeVisible({ timeout: 30_000 })
  })

  test('Health Shop has category filter', async ({ page }) => {
    await page.goto('/search/health-shop', { waitUntil: 'domcontentloaded' })

    // Should have a category filter/dropdown
    const filter = page.locator('select, [role="combobox"], text=/category|filter/i').first()
    await expect(filter).toBeVisible({ timeout: 30_000 })
  })

  test('Health Shop accessible after patient login', async ({ page }) => {
    await loginAs(page, 'patient1@mediwyz.com', 'Patient123!')
    await page.goto('/search/health-shop', { waitUntil: 'domcontentloaded' })

    const content = page.locator('text=/health shop|shop|browse|products|items/i').first()
    await expect(content).toBeVisible({ timeout: 30_000 })
  })
})
