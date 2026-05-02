import { ReimbursementContext, ReimbursementRule, RuleResult } from '../types';

/** Insurance covers (100 - coPayPercent)%. Member covers the rest. */
export class CoPayRule implements ReimbursementRule {
  readonly name = 'CoPay';
  apply(amount: number, ctx: ReimbursementContext): RuleResult {
    const ratio = Math.max(0, 1 - ctx.plan.coPayPercent / 100);
    const eligibleAmount = Math.round(amount * ratio * 100) / 100;
    return {
      pass: true,
      eligibleAmount,
      message: `Insurance covers ${(ratio * 100).toFixed(0)}% → ${eligibleAmount.toFixed(0)} MUR`,
    };
  }
}
