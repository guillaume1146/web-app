/**
 * Reimbursement rules engine — shared types.
 *
 * The engine is a list of Strategy objects, each implementing a single
 * business rule (waiting period, deductible, co-pay, annual ceiling, …).
 * They're applied in order; each rule can reduce the eligible amount or
 * short-circuit with a rejection. Every decision is logged so the member,
 * owner, and auditors can see exactly how the payout was computed.
 */

export interface ReimbursementContext {
  claim: {
    id: string;
    amount: number;        // requested amount
    category?: string;     // e.g. 'consultation', 'dental', 'hospitalization'
    description: string;
    createdAt: Date;
    receiptUrl?: string | null;
  };
  member: {
    id: string;
    policyId: string;
    joinedAt: Date;
    ytdClaimsPaid: number;
    deductibleUsed: number;
  };
  plan: {
    annualCeiling: number;
    deductible: number;
    coPayPercent: number;
    waitingPeriodDays: number;
    categoryLimits: Record<string, number>;
  };
  priorClaimsLast48h?: number;
  priorClaims90dMedian?: number;
  duplicateReceiptHash?: boolean;
}

export interface RuleResult {
  /** True means the rule passed. False means it rejected the claim. */
  pass: boolean;
  /** Amount after applying this rule (≤ input amount). */
  eligibleAmount: number;
  /** Human-readable explanation — surfaced in the audit log + UI. */
  message: string;
  /** Flags set by fraud heuristics that don't auto-reject but require review. */
  reviewFlag?: string;
}

export interface ReimbursementRule {
  readonly name: string;
  /**
   * Apply the rule. `amount` is the running eligible amount from prior
   * rules; return an updated amount + explanation.
   */
  apply(amount: number, ctx: ReimbursementContext): RuleResult;
}

export interface ReimbursementDecision {
  decision: 'approved' | 'denied' | 'pending_review';
  payoutAmount: number;
  memberPaysAmount: number;
  reason?: string;
  rulesApplied: Array<{ rule: string; pass: boolean; amount: number; message: string; reviewFlag?: string }>;
}
