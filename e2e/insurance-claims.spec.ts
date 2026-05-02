import { test, expect, Page } from '@playwright/test'

/**
 * Insurance-claim golden path.
 *
 *   1. Member logs in, files a claim against an insurance company.
 *   2. Owner logs in, sees the pending claim, approves it.
 *   3. Member's wallet balance reflects the credit.
 *
 * Uses the seeded MediShield Mauritius company + seeded patient Emma
 * (from `47-insurance-favorites-streaks.seed.ts`).
 */

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByPlaceholder(/email/i).first().fill(email)
  await page.getByPlaceholder(/password/i).first().fill(password)
  await page.getByRole('button', { name: /sign in|log ?in/i }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

async function readWalletBalance(page: Page): Promise<number> {
  // Wallet balance widget is present on most dashboards; parse the number.
  const text = await page.locator('text=/Rs\\s+[\\d,]+/').first().textContent({ timeout: 3000 }).catch(() => '')
  const match = (text ?? '').match(/Rs\s*([\d,]+)/)
  return match ? Number(match[1].replace(/,/g, '')) : 0
}

test.describe('Insurance claim — member → owner → payout', () => {
  test('member files → owner approves → member balance credits', async ({ browser }) => {
    // Two sessions so we don't have to log out/in.
    const memberCtx = await browser.newContext()
    const ownerCtx = await browser.newContext()
    const member = await memberCtx.newPage()
    const owner = await ownerCtx.newPage()

    await login(member, 'emma.johnson@mediwyz.com', 'Patient123!')
    await login(owner, 'sarah.johnson@mediwyz.com', 'Doctor123!')

    // Step 1 — member files a claim
    await member.goto('/insurance/claims')
    await expect(member.getByRole('heading', { name: /insurance claims/i })).toBeVisible()

    await member.getByRole('button', { name: /file a claim/i }).click()
    await member.locator('select').first().selectOption({ label: /MediShield/ })
    await member.getByPlaceholder(/describe/i).fill('E2E test claim — follow-up visit')
    await member.getByPlaceholder(/amount/i).fill('750')
    await member.getByRole('button', { name: /submit claim/i }).click()

    // New claim appears in the list with Pending badge
    await expect(member.getByText('E2E test claim — follow-up visit').first()).toBeVisible({ timeout: 8000 })
    await expect(member.getByText(/pending/i).first()).toBeVisible()

    // Step 2 — owner approves
    await owner.goto('/insurance/claims')
    await owner.getByRole('button', { name: /as owner/i }).click()
    await expect(owner.getByText('E2E test claim — follow-up visit').first()).toBeVisible({ timeout: 8000 })

    // Capture member's wallet BEFORE approve
    await member.goto('/patient/billing')
    const balanceBefore = await readWalletBalance(member)

    await owner.getByRole('button', { name: /approve/i }).first().click()

    // Step 3 — member wallet reflects the +750 credit
    await member.goto('/patient/billing')
    // Wallet balance may need a moment for the transaction to settle.
    await member.waitForTimeout(1000)
    const balanceAfter = await readWalletBalance(member)
    expect(balanceAfter - balanceBefore).toBeGreaterThanOrEqual(750)

    await memberCtx.close()
    await ownerCtx.close()
  })
})
