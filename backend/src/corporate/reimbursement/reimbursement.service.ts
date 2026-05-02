import { Injectable } from '@nestjs/common';
import { ReimbursementContext, ReimbursementDecision, ReimbursementRule } from './types';
import { WaitingPeriodRule } from './rules/waiting-period.rule';
import { DeductibleRule } from './rules/deductible.rule';
import { CoPayRule } from './rules/co-pay.rule';
import { CategoryLimitRule } from './rules/category-limit.rule';
import { AnnualCeilingRule } from './rules/annual-ceiling.rule';
import { FraudHeuristicRule } from './rules/fraud-heuristic.rule';

/**
 * Applies reimbursement rules in order, accumulates a trail, returns the
 * final payout + reason. Deterministic, pure, no I/O — easy to unit test.
 *
 * Order matters:
 *   1. WaitingPeriod  (hard reject early)
 *   2. Deductible     (member pays first X before insurance pays anything)
 *   3. CoPay          (apply share split on the remaining amount)
 *   4. CategoryLimit  (per-category cap)
 *   5. AnnualCeiling  (yearly cap across all categories)
 *   6. FraudHeuristic (flag for manual review — never auto-reject here)
 */
@Injectable()
export class ReimbursementService {
  /** Default rule pipeline — override in tests. */
  private readonly rules: ReimbursementRule[] = [
    new WaitingPeriodRule(),
    new DeductibleRule(),
    new CoPayRule(),
    new CategoryLimitRule(),
    new AnnualCeilingRule(),
    new FraudHeuristicRule(),
  ];

  evaluate(ctx: ReimbursementContext): ReimbursementDecision {
    const applied: ReimbursementDecision['rulesApplied'] = [];
    let amount = ctx.claim.amount;
    let rejected = false;
    let reason: string | undefined;
    let reviewFlag: string | undefined;

    for (const rule of this.rules) {
      const res = rule.apply(amount, ctx);
      applied.push({ rule: rule.name, pass: res.pass, amount: res.eligibleAmount, message: res.message, reviewFlag: res.reviewFlag });
      if (!res.pass) {
        rejected = true;
        reason = res.message;
        amount = 0;
        break;
      }
      amount = res.eligibleAmount;
      if (res.reviewFlag) reviewFlag = res.reviewFlag;
    }

    const payoutAmount = Math.max(0, Math.round(amount * 100) / 100);
    const memberPaysAmount = Math.max(0, ctx.claim.amount - payoutAmount);

    const decision: ReimbursementDecision['decision'] = rejected
      ? 'denied'
      : reviewFlag ? 'pending_review' : 'approved';

    return { decision, payoutAmount, memberPaysAmount, reason, rulesApplied: applied };
  }
}
