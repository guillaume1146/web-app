import { ReimbursementContext, ReimbursementRule, RuleResult } from '../types';

/** Claims within N days of joining a plan are rejected outright. */
export class WaitingPeriodRule implements ReimbursementRule {
  readonly name = 'WaitingPeriod';
  apply(amount: number, ctx: ReimbursementContext): RuleResult {
    const ms = ctx.claim.createdAt.getTime() - ctx.member.joinedAt.getTime();
    const days = Math.floor(ms / 86_400_000);
    if (days < ctx.plan.waitingPeriodDays) {
      return {
        pass: false,
        eligibleAmount: 0,
        message: `Waiting period: ${days}d since joined, need ${ctx.plan.waitingPeriodDays}d`,
      };
    }
    return { pass: true, eligibleAmount: amount, message: `OK (${days}d since joined)` };
  }
}
