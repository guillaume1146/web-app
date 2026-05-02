/**
 * Canonical string literals for WalletTransaction.type / TreasuryTransaction.type.
 *
 * These lived as scattered lowercase literals across the codebase (`'credit'`,
 * `'debit'`) until new insurance flows accidentally wrote uppercase variants
 * (`'CREDIT'`, `'DEBIT'`), which silently broke admin spend analytics that
 * filter by the lowercase form. Pin them here so every caller uses the same
 * constants and grep surfaces them consistently.
 */

export const WalletTxType = {
  CREDIT: 'credit',
  DEBIT: 'debit',
} as const;

export type WalletTxTypeValue = typeof WalletTxType[keyof typeof WalletTxType];

/**
 * Canonical `TreasuryTransaction.type` values. Insurance-company money
 * movements use these to separate inflow categories from outflow categories
 * when computing loss-ratio / platform-fee totals.
 */
export const TreasuryTxType = {
  /** Member monthly contribution (after platform fee). */
  CONTRIBUTION: 'contribution',
  /** Platform fee carved out of a contribution. Sits on the treasury ledger
   *  for auditability even though the fee flows to PlatformTreasury. */
  PLATFORM_FEE: 'platform_fee',
  /** Reimbursement paid out to a member wallet. */
  CLAIM_PAYOUT: 'claim_payout',
  /** Direct-billed payout straight to a provider wallet (tiers payant). */
  DIRECT_BILLING: 'direct_billing',
} as const;

export type TreasuryTxTypeValue = typeof TreasuryTxType[keyof typeof TreasuryTxType];
