import { ReimbursementContext, ReimbursementRule, RuleResult } from '../types';

/** Caps reimbursement by the plan's annual per-member ceiling. */
export class AnnualCeilingRule implements ReimbursementRule {
  readonly name = 'AnnualCeiling';
  apply(amount: number, ctx: ReimbursementContext): RuleResult {
    const remaining = Math.max(0, ctx.plan.annualCeiling - ctx.member.ytdClaimsPaid);
    if (remaining <= 0) {
      return {
        pass: false,
        eligibleAmount: 0,
        message: `Annual ceiling (${ctx.plan.annualCeiling.toFixed(0)}) reached — already paid ${ctx.member.ytdClaimsPaid.toFixed(0)} this year`,
      };
    }
    const eligibleAmount = Math.min(amount, remaining);
    return {
      pass: true,
      eligibleAmount,
      message: eligibleAmount < amount
        ? `Capped at remaining annual allowance: ${remaining.toFixed(0)} MUR`
        : `Under annual ceiling (${remaining.toFixed(0)} MUR remaining after)`,
    };
  }
}
