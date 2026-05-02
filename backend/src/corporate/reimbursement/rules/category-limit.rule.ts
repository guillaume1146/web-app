import { ReimbursementContext, ReimbursementRule, RuleResult } from '../types';

/** Caps reimbursement by per-category ceiling (e.g., consultation: 2000). */
export class CategoryLimitRule implements ReimbursementRule {
  readonly name = 'CategoryLimit';
  apply(amount: number, ctx: ReimbursementContext): RuleResult {
    const cat = ctx.claim.category?.toLowerCase();
    if (!cat) {
      return { pass: true, eligibleAmount: amount, message: 'No category — skipped' };
    }
    const cap = ctx.plan.categoryLimits?.[cat];
    if (cap == null || cap <= 0) {
      return { pass: true, eligibleAmount: amount, message: `No cap for "${cat}"` };
    }
    const eligibleAmount = Math.min(amount, cap);
    return {
      pass: true,
      eligibleAmount,
      message: eligibleAmount < amount
        ? `Capped at ${cap.toFixed(0)} MUR for "${cat}"`
        : `Under cap of ${cap.toFixed(0)} MUR for "${cat}"`,
    };
  }
}
