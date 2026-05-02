# Money Flow — Health Credit System

## Core Principle
MediWyz runs an **internal ledger** in "Health Credit" (HC). 1 HC = 1 MUR (configurable per region). MCB Juice / real-money integration is **not yet wired** — every money movement is an internal ledger transfer. The abstractions below must stay intact so swapping in real money later is a plumbing change, not an architecture rewrite.

## Wallets & Treasuries — the ONLY balance-holding entities

| Model | Who owns it | What it holds |
|---|---|---|
| `UserWallet` | Every user (member, provider, regional admin) | Personal HC balance |
| `InsuranceCompanyTreasury` | Each insurance company (1:1 with `CorporateAdminProfile.isInsuranceCompany=true`) | Pooled premium income minus payouts |
| `PlatformTreasury` | MediWyz itself (singleton) | Platform fee cut from every contribution + subscription |

Any money movement MUST:
1. Read the source balance.
2. Write the destination balance.
3. Record a ledger entry (`WalletTransaction` or `TreasuryTransaction`) with `balanceBefore` / `balanceAfter` — never forget this.
4. Happen inside a `prisma.$transaction(...)` — partial state is a bug.

## HC inflows (money entering the MediWyz economy)

| Source | Lands in | Amount | File |
|---|---|---|---|
| Signup bonus | Member wallet | Config (seeded) | `auth/auth.service.ts` |
| Referral task reward | Referrer's wallet | Task-dependent | `referral-tracking/*` |
| Wallet top-up (future: MCB Juice) | Member wallet | User chooses | `users/wallet-topup.controller.ts` |
| Admin trial reset | Member wallet | Custom | `users/reset-trial.service.ts` |

## HC outflows + internal transfers

| Flow | From → To | Trigger | Service |
|---|---|---|---|
| Book a provider | member wallet → provider wallet | Booking accepted | `bookings/bookings.service.ts` |
| Individual subscription | member wallet → platform treasury | Monthly cron / signup | `subscriptions/subscriptions.service.ts` |
| Corporate employer subscription | corp-admin wallet → platform treasury | Bulk enrollment | `corporate/corporate.service.ts` (enrollEmployees) |
| Join insurance | member wallet → insurance treasury **(platform fee cut)** | On join | `corporate/corporate.service.ts` + `TreasuryService.creditContribution` |
| Monthly insurance contribution | member wallet → insurance treasury **(platform fee cut)** | Monthly cron | `corporate/policy-renewal.service.ts` |
| Reimbursed claim | insurance treasury → member wallet | Owner approves, rules engine OKs | `corporate/corporate.service.ts` (approveClaim) + `TreasuryService.payoutClaim` |
| Tiers payant (direct billing) | insurance treasury → provider wallet | Provider marks pre-auth used | `corporate/pre-authorization.service.ts` (usePreAuth) + `TreasuryService.payoutProviderDirect` |
| Platform fee | member / corp wallet → platform treasury | Bundled with any contribution | `corporate/treasury.service.ts` (uses `MEDIWYZ_PLATFORM_FEE_PERCENT`, default 5%) |

## Pre-flight balance check (mandatory)

Before any debit, the service layer MUST check affordability and throw a typed exception on failure. Never let a debit produce a negative balance.

```ts
if (wallet.balance < amount) {
  throw new BadRequestException(`Insufficient credit: have ${wallet.balance}, need ${amount}`);
}
```

For treasuries the same rule applies via `TreasuryService.payoutClaim` / `payoutProviderDirect` — both throw when the treasury is under-funded.

## Insurance rules engine — runs on EVERY claim decision

Rules (in order) in `corporate/reimbursement/rules/*.rule.ts`:
`WaitingPeriod → Deductible → CoPay → CategoryLimit → AnnualCeiling → FraudHeuristic`

- `pass=false` short-circuits with a denial (no money moves).
- `reviewFlag` routes the decision to `pending_review` (no money moves until owner manually resolves).
- Only `decision === 'approved'` triggers `TreasuryService.payoutClaim`.
- Every decision (approved / denied / pending) writes a `ClaimDecisionLog` row — audit trail is non-negotiable.

## Subscription gating

Booking services that require a subscription:
1. Look up `UserSubscription` for the member.
2. If corporate-paid (`corporateAdminId` set): employer pays; member consumes quota.
3. If individual: member's wallet was already debited at signup — just track `SubscriptionUsage`.
4. Quota exhausted → member still pays at the normal (non-discounted) price from their wallet.

Never let a member with a lapsed subscription get the subscription-discounted price.

## Forbidden patterns

- ❌ Direct `prisma.userWallet.update({ balance: ... })` without writing a `WalletTransaction` entry.
- ❌ Treasury update outside of `TreasuryService` methods (the helper enforces ledger entries + platform fee cut).
- ❌ Status changes on a claim/pre-auth that move money without passing through the rules engine.
- ❌ Computing fees client-side and trusting them server-side. The fee percent lives in env.
- ❌ `balance: { decrement: X }` without a prior affordability check.
- ❌ Logging a money movement but not emitting a `Notification` to the affected user — every user must see every HC movement that touches their wallet.
- ❌ Hardcoding currency symbols ("Rs", "MUR") — use `useCurrency()` on frontend, store numbers only on backend.

## Debugging money flow

When a member says "my balance is wrong":
1. Read their `WalletTransaction` history (`walletId`, ordered by `createdAt`).
2. Confirm every row's `balanceBefore` + `(CREDIT=+, DEBIT=-)` `amount` equals `balanceAfter`.
3. If a gap exists, it means a write skipped the ledger — a bug to fix, not a number to adjust.
4. Never "just fix" a balance — always add a compensating `WalletTransaction` with a clear description.

The same applies to `TreasuryTransaction` for insurance companies.
