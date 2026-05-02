import { ReimbursementService } from './reimbursement.service';
import { WaitingPeriodRule } from './rules/waiting-period.rule';
import { DeductibleRule } from './rules/deductible.rule';
import { CoPayRule } from './rules/co-pay.rule';
import { CategoryLimitRule } from './rules/category-limit.rule';
import { AnnualCeilingRule } from './rules/annual-ceiling.rule';
import { FraudHeuristicRule } from './rules/fraud-heuristic.rule';
import { ReimbursementContext } from './types';

/**
 * Deterministic tests for the rules engine. These are the load-bearing
 * checks for real money flow — a regression here would quietly overpay or
 * shortchange members, so every rule is exercised in isolation + the full
 * pipeline is exercised end-to-end.
 */

const DAY = 86_400_000;

function buildCtx(overrides: Partial<ReimbursementContext> = {}): ReimbursementContext {
  const now = new Date();
  return {
    claim: {
      id: 'C1', amount: 1000,
      description: 'Consultation', createdAt: now,
    },
    member: {
      id: 'M1', policyId: 'P1',
      joinedAt: new Date(now.getTime() - 365 * DAY),
      ytdClaimsPaid: 0, deductibleUsed: 0,
    },
    plan: {
      annualCeiling: 100_000, deductible: 0,
      coPayPercent: 0, waitingPeriodDays: 0,
      categoryLimits: {},
    },
    ...overrides,
  };
}

describe('WaitingPeriodRule', () => {
  const rule = new WaitingPeriodRule();

  it('rejects claims inside the waiting window', () => {
    const ctx = buildCtx({
      member: { id: 'M1', policyId: 'P1', joinedAt: new Date(Date.now() - 10 * DAY), ytdClaimsPaid: 0, deductibleUsed: 0 },
      plan: { ...buildCtx().plan, waitingPeriodDays: 30 },
    });
    const res = rule.apply(1000, ctx);
    expect(res.pass).toBe(false);
    expect(res.eligibleAmount).toBe(0);
  });

  it('passes claims after the waiting window', () => {
    const ctx = buildCtx({
      member: { id: 'M1', policyId: 'P1', joinedAt: new Date(Date.now() - 60 * DAY), ytdClaimsPaid: 0, deductibleUsed: 0 },
      plan: { ...buildCtx().plan, waitingPeriodDays: 30 },
    });
    const res = rule.apply(1000, ctx);
    expect(res.pass).toBe(true);
    expect(res.eligibleAmount).toBe(1000);
  });
});

describe('DeductibleRule', () => {
  const rule = new DeductibleRule();

  it('deducts the full deductible from the claim', () => {
    const ctx = buildCtx({
      member: { ...buildCtx().member, deductibleUsed: 0 },
      plan: { ...buildCtx().plan, deductible: 500 },
    });
    const res = rule.apply(1000, ctx);
    expect(res.eligibleAmount).toBe(500);
  });

  it('partially applies remaining deductible', () => {
    const ctx = buildCtx({
      member: { ...buildCtx().member, deductibleUsed: 300 },
      plan: { ...buildCtx().plan, deductible: 500 },
    });
    const res = rule.apply(1000, ctx);
    expect(res.eligibleAmount).toBe(800); // 1000 - (500 - 300)
  });

  it('passes through when deductible is already met', () => {
    const ctx = buildCtx({
      member: { ...buildCtx().member, deductibleUsed: 500 },
      plan: { ...buildCtx().plan, deductible: 500 },
    });
    const res = rule.apply(1000, ctx);
    expect(res.eligibleAmount).toBe(1000);
  });
});

describe('CoPayRule', () => {
  const rule = new CoPayRule();

  it('applies 20% co-pay → covers 80%', () => {
    const ctx = buildCtx({ plan: { ...buildCtx().plan, coPayPercent: 20 } });
    expect(rule.apply(1000, ctx).eligibleAmount).toBe(800);
  });

  it('0% co-pay covers the full amount', () => {
    expect(new CoPayRule().apply(1000, buildCtx()).eligibleAmount).toBe(1000);
  });

  it('100% co-pay covers nothing', () => {
    const ctx = buildCtx({ plan: { ...buildCtx().plan, coPayPercent: 100 } });
    expect(rule.apply(1000, ctx).eligibleAmount).toBe(0);
  });
});

describe('CategoryLimitRule', () => {
  const rule = new CategoryLimitRule();

  it('caps claim at per-category ceiling', () => {
    const ctx = buildCtx({
      claim: { ...buildCtx().claim, category: 'consultation' },
      plan: { ...buildCtx().plan, categoryLimits: { consultation: 500 } },
    });
    expect(rule.apply(1000, ctx).eligibleAmount).toBe(500);
  });

  it('is case-insensitive on category', () => {
    const ctx = buildCtx({
      claim: { ...buildCtx().claim, category: 'DENTAL' },
      plan: { ...buildCtx().plan, categoryLimits: { dental: 300 } },
    });
    expect(rule.apply(1000, ctx).eligibleAmount).toBe(300);
  });

  it('passes through when category has no cap', () => {
    const ctx = buildCtx({
      claim: { ...buildCtx().claim, category: 'hospitalization' },
      plan: { ...buildCtx().plan, categoryLimits: { consultation: 500 } },
    });
    expect(rule.apply(1000, ctx).eligibleAmount).toBe(1000);
  });
});

describe('AnnualCeilingRule', () => {
  const rule = new AnnualCeilingRule();

  it('rejects once the ceiling is reached', () => {
    const ctx = buildCtx({
      member: { ...buildCtx().member, ytdClaimsPaid: 100_000 },
      plan: { ...buildCtx().plan, annualCeiling: 100_000 },
    });
    const res = rule.apply(500, ctx);
    expect(res.pass).toBe(false);
    expect(res.eligibleAmount).toBe(0);
  });

  it('caps at remaining allowance near the ceiling', () => {
    const ctx = buildCtx({
      member: { ...buildCtx().member, ytdClaimsPaid: 99_500 },
      plan: { ...buildCtx().plan, annualCeiling: 100_000 },
    });
    expect(rule.apply(1000, ctx).eligibleAmount).toBe(500);
  });
});

describe('FraudHeuristicRule', () => {
  const rule = new FraudHeuristicRule();

  it('does not flag a clean claim', () => {
    const res = rule.apply(1000, buildCtx());
    expect(res.reviewFlag).toBeUndefined();
  });

  it('flags duplicate receipts', () => {
    const ctx = buildCtx({ duplicateReceiptHash: true });
    const res = rule.apply(1000, ctx);
    expect(res.reviewFlag).toContain('duplicate_receipt');
  });

  it('flags velocity > 3 claims in 48h', () => {
    const ctx = buildCtx({ priorClaimsLast48h: 5 });
    const res = rule.apply(1000, ctx);
    expect(res.reviewFlag).toContain('velocity_high');
  });

  it('flags amount anomaly (> 3× member 90d median)', () => {
    const ctx = buildCtx({ priorClaims90dMedian: 200 });
    const res = rule.apply(1000, ctx); // 1000 > 3 * 200
    expect(res.reviewFlag).toContain('amount_anomaly');
  });

  it('never short-circuits — always passes so downstream can decide', () => {
    const ctx = buildCtx({ duplicateReceiptHash: true });
    expect(rule.apply(1000, ctx).pass).toBe(true);
  });
});

describe('ReimbursementService pipeline', () => {
  const service = new ReimbursementService();

  it('happy path: no deductible, no co-pay, approved full amount', () => {
    const res = service.evaluate(buildCtx());
    expect(res.decision).toBe('approved');
    expect(res.payoutAmount).toBe(1000);
    expect(res.memberPaysAmount).toBe(0);
  });

  it('short-circuits on waiting-period rejection without paying anything', () => {
    const ctx = buildCtx({
      member: { ...buildCtx().member, joinedAt: new Date(Date.now() - 5 * DAY) },
      plan: { ...buildCtx().plan, waitingPeriodDays: 30 },
    });
    const res = service.evaluate(ctx);
    expect(res.decision).toBe('denied');
    expect(res.payoutAmount).toBe(0);
    expect(res.memberPaysAmount).toBe(1000);
    // The denial MUST be logged even though the pipeline short-circuits.
    expect(res.rulesApplied[0]).toMatchObject({ rule: 'WaitingPeriod', pass: false });
  });

  it('stacks deductible + co-pay correctly', () => {
    // 1000 claim, 500 deductible unused, 20% co-pay
    // After deductible: 500 remains. Co-pay takes 20% → 400 paid, 100 to member on top of 500 deductible.
    const ctx = buildCtx({
      claim: { ...buildCtx().claim, amount: 1000 },
      plan: { ...buildCtx().plan, deductible: 500, coPayPercent: 20 },
    });
    const res = service.evaluate(ctx);
    expect(res.decision).toBe('approved');
    expect(res.payoutAmount).toBe(400);
    expect(res.memberPaysAmount).toBe(600);
  });

  it('routes to pending_review when fraud flag is set', () => {
    const ctx = buildCtx({ duplicateReceiptHash: true });
    const res = service.evaluate(ctx);
    expect(res.decision).toBe('pending_review');
    // Money would still compute — but the decision says "do not auto-pay".
  });

  it('applies category cap BEFORE annual ceiling', () => {
    // category cap 300 beats annual remaining 500 → eligible 300 wins.
    const ctx = buildCtx({
      claim: { ...buildCtx().claim, amount: 1000, category: 'dental' },
      member: { ...buildCtx().member, ytdClaimsPaid: 99_500 },
      plan: {
        ...buildCtx().plan,
        annualCeiling: 100_000,
        categoryLimits: { dental: 300 },
      },
    });
    const res = service.evaluate(ctx);
    expect(res.payoutAmount).toBe(300);
  });

  it('caps on annual ceiling when category has no cap', () => {
    const ctx = buildCtx({
      claim: { ...buildCtx().claim, amount: 1000, category: 'other' },
      member: { ...buildCtx().member, ytdClaimsPaid: 99_500 },
      plan: { ...buildCtx().plan, annualCeiling: 100_000 },
    });
    const res = service.evaluate(ctx);
    expect(res.payoutAmount).toBe(500);
  });

  it('records every rule in rulesApplied for the audit trail', () => {
    const res = service.evaluate(buildCtx());
    const names = res.rulesApplied.map((r) => r.rule);
    expect(names).toEqual(['WaitingPeriod', 'Deductible', 'CoPay', 'CategoryLimit', 'AnnualCeiling', 'FraudHeuristic']);
  });
});
