import { ReimbursementContext, ReimbursementRule, RuleResult } from '../types';

/** Member pays the annual deductible before insurance pays anything. */
export class DeductibleRule implements ReimbursementRule {
  readonly name = 'Deductible';
  apply(amount: number, ctx: ReimbursementContext): RuleResult {
    const remainingDeductible = Math.max(0, ctx.plan.deductible - ctx.member.deductibleUsed);
    if (remainingDeductible <= 0) {
      return { pass: true, eligibleAmount: amount, message: 'Deductible already met' };
    }
    const applied = Math.min(amount, remainingDeductible);
    const eligibleAmount = Math.max(0, amount - applied);
    return {
      pass: true,
      eligibleAmount,
      message: `Applied ${applied.toFixed(0)} MUR of deductible (${remainingDeductible.toFixed(0)} remaining before)`,
    };
  }
}
