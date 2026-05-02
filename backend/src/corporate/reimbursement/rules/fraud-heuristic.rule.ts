import { ReimbursementContext, ReimbursementRule, RuleResult } from '../types';

/**
 * Lightweight fraud signals — NOT an auto-rejecter. Sets a reviewFlag so the
 * downstream service routes suspicious claims to manual review instead of
 * auto-approval. No ML required; just three deterministic checks.
 */
export class FraudHeuristicRule implements ReimbursementRule {
  readonly name = 'FraudHeuristic';
  apply(amount: number, ctx: ReimbursementContext): RuleResult {
    const flags: string[] = [];

    if (ctx.duplicateReceiptHash) flags.push('duplicate_receipt');
    if ((ctx.priorClaimsLast48h ?? 0) > 3) flags.push('velocity_high');
    const median = ctx.priorClaims90dMedian ?? 0;
    if (median > 0 && amount > median * 3) flags.push('amount_anomaly');

    if (flags.length === 0) {
      return { pass: true, eligibleAmount: amount, message: 'No fraud signals' };
    }
    return {
      pass: true,
      eligibleAmount: amount,
      message: `Flagged for review: ${flags.join(', ')}`,
      reviewFlag: flags.join(','),
    };
  }
}
