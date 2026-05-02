---
description: Audit every Health Credit movement in MediWyz — wallets, treasuries, referrals, subscriptions, insurance claims — and report ledger integrity + affordability + rules-engine issues
user-invocable: true
---

# Audit Money Flow

Exhaustive audit of every code path that reads or writes Health Credit (HC) balances. Produces a graded report with fixable findings and an "improvements" list.

## What this skill does

1. Reads `.claude/rules/money-flow.md` first to ground itself in the authoritative contracts.
2. Spawns the `money-flow-reviewer` agent to audit each of the 7 canonical flows:
   - Signup bonus + referral rewards
   - Wallet top-up
   - Member → provider booking
   - Member → insurance treasury (join + monthly contribution via cron)
   - Insurance treasury → member wallet (claim reimbursement, rules engine)
   - Insurance treasury → provider wallet (tiers payant direct billing)
   - Individual + corporate subscriptions → platform treasury
3. Collects findings and groups them by severity (Critical / Important / Minor).
4. Appends an "Improvements" section for the top high-leverage fixes (missing invariants, missing reconciliation, missing idempotency).

## When to use

- Before merging any PR that touches `UserWallet`, `InsuranceCompanyTreasury`, `PlatformTreasury`, `WalletTransaction`, `TreasuryTransaction`, `ClaimDecisionLog`, `InsurancePolicy`, `PreAuthorization`, or `ReimbursementService`.
- Before enabling real-money top-up (MCB Juice integration) — the internal ledger must be bulletproof first.
- Quarterly health-check to catch drift.
- After adding a new paid feature (new booking type, new subscription tier, new capability).

## Outputs

Markdown report with:

### Section 1 — Flow coverage
Table of each canonical flow, with:
- Entry points found (`file:line`)
- Ledger-entry check: ✓ / ✗ / partial
- Affordability check: ✓ / ✗
- Rules-engine gate (insurance only): ✓ / ✗
- Notification emitted: ✓ / ✗

### Section 2 — Findings
Critical / Important / Minor. Each finding: `file:line`, snippet, explanation, suggested fix.

### Section 3 — Improvements
Up to 5 high-leverage upgrades. Examples:
- "Add a nightly job that asserts `sum(WalletTransaction.amount signed) === wallet.balance` per user and alerts on drift."
- "Add an idempotency key on `PolicyRenewal` so a double-fire of the cron can't double-bill."
- "Expose `GET /admin/platform-treasury` so finance can reconcile the platform cut against premium inflows."

### Section 4 — Test gaps
List money-flow invariants NOT covered by tests. Suggest one test per gap.

## Commands to run afterwards

- `npx jest backend/src/corporate` — confirms rules engine + treasury tests still pass.
- `npx tsc --noEmit` in both `backend/` and root — confirms the audit didn't expose type-level regressions.

## Hands-off behaviour

Do NOT modify code as part of this skill — audit only. The user decides which findings to fix and in what order. If the user asks you to fix something afterwards, use `add-service` / `add-api-route` / direct edits as appropriate for the specific fix.
