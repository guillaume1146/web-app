import { Test, TestingModule } from '@nestjs/testing';
import { CorporateService } from './corporate.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TreasuryService } from '../shared/services/treasury.service';
import { MoneyFormatService } from '../shared/services/money-format.service';
import { ReimbursementService } from './reimbursement/reimbursement.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * Regression tests for the analytics / transfer / delete / claims
 * lifecycle added in the feature-polish round. Mocked Prisma so no DB
 * is touched.
 */
describe('CorporateService — analytics + ownership + claims', () => {
  let service: CorporateService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      corporateAdminProfile: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      corporateEmployee: {
        count: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      userSubscription: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      subscriptionPlan: {
        findUnique: jest.fn(),
      },
      insuranceClaimSubmission: {
        groupBy: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
      insurancePolicy: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      claimDecisionLog: { create: jest.fn() },
      user: { findUnique: jest.fn() },
      userWallet: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      walletTransaction: { create: jest.fn() },
      $transaction: jest.fn().mockImplementation(async (fn: any) => fn(prisma)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporateService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: { createNotification: jest.fn().mockResolvedValue({}) } },
        { provide: TreasuryService, useValue: {
            creditContribution: jest.fn(), payoutClaim: jest.fn(),
            payoutProviderDirect: jest.fn(), ensureCompanyTreasury: jest.fn(),
            creditPlatformFee: jest.fn(),
          } },
        { provide: ReimbursementService, useValue: {
            evaluate: jest.fn().mockReturnValue({
              decision: 'approved', payoutAmount: 0, memberPaysAmount: 0, rulesApplied: [],
            }),
          } },
        { provide: MoneyFormatService, useValue: {
            format: (a: number, c = 'MUR') => `${a.toFixed(0)} ${c}`,
            formatForUser: (a: number) => Promise.resolve(`${a.toFixed(0)} MUR`),
            currencyFor: () => Promise.resolve('MUR'),
          } },
      ],
    }).compile();
    service = module.get(CorporateService);
  });

  // ─── Analytics ─────────────────────────────────────────────────────────

  describe('getCompanyAnalytics', () => {
    it('throws when caller does not own a company', async () => {
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce(null);
      await expect(service.getCompanyAnalytics('U1')).rejects.toThrow(NotFoundException);
    });

    it('aggregates member counts, revenue, and claim status buckets', async () => {
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce({
        id: 'C1', userId: 'O1', companyName: 'Acme', monthlyContribution: 500, isInsuranceCompany: true,
      });
      prisma.corporateEmployee.count
        .mockResolvedValueOnce(8)  // active
        .mockResolvedValueOnce(2)  // pending
        .mockResolvedValueOnce(1)  // removed
        .mockResolvedValueOnce(11); // total
      prisma.insuranceClaimSubmission.groupBy.mockResolvedValueOnce([
        { status: 'pending', _count: 3, _sum: { amount: 2400 } },
        { status: 'paid',    _count: 5, _sum: { amount: 9000 } },
      ]);

      const res = await service.getCompanyAnalytics('O1');
      expect(res.members).toEqual({ active: 8, pending: 2, removed: 1, total: 11 });
      // revenue = 500 * 8 = 4000
      expect(res.monthlyExpectedRevenue).toBe(4000);
      expect(res.claimsByStatus.pending.count).toBe(3);
      expect(res.claimsByStatus.paid.totalAmount).toBe(9000);
      // Bucket shape respected even when not returned by groupBy
      expect(res.claimsByStatus.approved.count).toBe(0);
      expect(res.claimsByStatus.denied.count).toBe(0);
    });
  });

  // ─── Transfer ─────────────────────────────────────────────────────────

  describe('transferCompany', () => {
    it('throws NotFound when company is not yours', async () => {
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce(null);
      await expect(service.transferCompany('O1', 'C1', 'new@x.com')).rejects.toThrow(NotFoundException);
    });

    it('throws when new owner email does not exist', async () => {
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce({ id: 'C1', companyName: 'Acme' });
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.transferCompany('O1', 'C1', 'ghost@x.com')).rejects.toThrow(NotFoundException);
    });

    it('rejects self-transfer', async () => {
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce({ id: 'C1', companyName: 'Acme' });
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'O1' });
      await expect(service.transferCompany('O1', 'C1', 'self@x.com')).rejects.toThrow(BadRequestException);
    });

    it('allows transfer to a user who already owns a company (multi-company)', async () => {
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce({ id: 'C1', companyName: 'Acme' });
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'NEW' });
      prisma.corporateAdminProfile.update.mockResolvedValueOnce({ id: 'C1', userId: 'NEW' });

      const out = await service.transferCompany('O1', 'C1', 'new@x.com');
      expect(out.userId).toBe('NEW');
    });
  });

  // ─── Delete ───────────────────────────────────────────────────────────

  describe('deleteCompany', () => {
    it('throws NotFound when company is not yours', async () => {
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce(null);
      await expect(service.deleteCompany('O1', 'C1')).rejects.toThrow(NotFoundException);
    });

    it('soft-removes all active+pending members, then deletes profile', async () => {
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce({ id: 'C1', userId: 'O1' });
      prisma.corporateEmployee.updateMany.mockResolvedValueOnce({ count: 5 });
      prisma.corporateAdminProfile.delete.mockResolvedValueOnce({});

      const res = await service.deleteCompany('O1', 'C1');
      expect(res).toEqual({ deleted: true, companyId: 'C1' });
      expect(prisma.corporateEmployee.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ corporateAdminId: 'O1', status: { in: ['active', 'pending'] } }),
      }));
    });
  });

  // ─── Claim approve → wallet credit ────────────────────────────────────

  describe('approveClaim', () => {
    const claim = {
      id: 'CL1', memberId: 'M1', amount: 1500, status: 'pending', companyProfileId: 'C1',
      company: { userId: 'O1', companyName: 'Acme' },
    };

    it('rejects if caller does not own the company', async () => {
      prisma.insuranceClaimSubmission.findUnique.mockResolvedValueOnce({
        ...claim, company: { userId: 'OTHER', companyName: 'X' },
      });
      await expect(service.approveClaim('O1', 'CL1')).rejects.toThrow(BadRequestException);
    });

    it('rejects if claim is not pending', async () => {
      prisma.insuranceClaimSubmission.findUnique.mockResolvedValueOnce({ ...claim, status: 'paid' });
      await expect(service.approveClaim('O1', 'CL1')).rejects.toThrow(BadRequestException);
    });

    it('delegates payout to TreasuryService and writes a ClaimDecisionLog', async () => {
      prisma.insuranceClaimSubmission.findUnique.mockResolvedValueOnce({
        ...claim, createdAt: new Date(), receiptUrl: null, description: 'x',
      });
      prisma.corporateEmployee.findUnique.mockResolvedValueOnce({ joinedAt: new Date(Date.now() - 365 * 86400e3) });
      prisma.insuranceClaimSubmission.update.mockResolvedValueOnce({ ...claim, status: 'paid' });

      // Pull the TreasuryService mock out of the test module and override evaluate result.
      const mod = (service as any);
      mod.treasury.payoutClaim = jest.fn().mockResolvedValue(undefined);
      mod.reimbursement.evaluate = jest.fn().mockReturnValue({
        decision: 'approved', payoutAmount: 1500, memberPaysAmount: 0,
        rulesApplied: [], reason: undefined,
      });

      const out = await service.approveClaim('O1', 'CL1');
      expect(mod.treasury.payoutClaim).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ claimId: 'CL1', amount: 1500, memberId: 'M1' }),
      );
      expect(prisma.claimDecisionLog.create).toHaveBeenCalled();
      expect(out.status).toBe('paid');
    });

    it('denies without paying when the rules engine rejects', async () => {
      prisma.insuranceClaimSubmission.findUnique.mockResolvedValueOnce({
        ...claim, createdAt: new Date(), receiptUrl: null, description: 'x',
      });
      prisma.corporateEmployee.findUnique.mockResolvedValueOnce({ joinedAt: new Date() });
      prisma.insuranceClaimSubmission.update.mockResolvedValueOnce({ ...claim, status: 'denied' });

      const mod = (service as any);
      mod.treasury.payoutClaim = jest.fn();
      mod.reimbursement.evaluate = jest.fn().mockReturnValue({
        decision: 'denied', payoutAmount: 0, memberPaysAmount: 1500,
        rulesApplied: [], reason: 'Waiting period',
      });

      const out = await service.approveClaim('O1', 'CL1');
      expect(mod.treasury.payoutClaim).not.toHaveBeenCalled();
      expect(out.status).toBe('denied');
    });
  });

  // ─── Claim deny ───────────────────────────────────────────────────────

  describe('denyClaim', () => {
    it('marks the claim denied with optional reviewer note', async () => {
      prisma.insuranceClaimSubmission.findUnique.mockResolvedValueOnce({
        id: 'CL1', status: 'pending', memberId: 'M1', amount: 800,
        companyProfileId: 'C1', company: { userId: 'O1', companyName: 'Acme' },
      });
      prisma.insuranceClaimSubmission.update.mockResolvedValueOnce({ id: 'CL1', status: 'denied' });

      const out = await service.denyClaim('O1', 'CL1', 'Not covered under basic plan');
      expect(out.status).toBe('denied');
      expect(prisma.insuranceClaimSubmission.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'CL1' },
        data: expect.objectContaining({ status: 'denied', reviewerNote: 'Not covered under basic plan' }),
      }));
      // No wallet movement on deny.
      expect(prisma.userWallet.update).not.toHaveBeenCalled();
    });
  });

  // ─── enrollEmployees — refund-on-switch edge case ─────────────────────
  describe('enrollEmployees', () => {
    const plan = { id: 'CORP-PLAN', name: 'Enterprise', price: 2000 };

    beforeEach(() => {
      prisma.subscriptionPlan.findUnique.mockResolvedValue(plan);
      prisma.corporateEmployee.findMany.mockResolvedValue([
        { userId: 'EMP1' },
        { userId: 'EMP2' },
      ]);
      prisma.userWallet.findUnique.mockImplementation(async (args: any) => {
        // The corporate-admin's wallet lookup (has plenty).
        if (args.where?.userId === 'ADMIN') return { id: 'W_ADMIN', balance: 100000, currency: 'MUR' };
        // Employee wallets for refund crediting.
        if (args.where?.userId === 'EMP1') return { id: 'W1', balance: 1000, currency: 'MUR' };
        if (args.where?.userId === 'EMP2') return { id: 'W2', balance: 500, currency: 'MUR' };
        return null;
      });
      prisma.userWallet.update.mockResolvedValue({ balance: 98000 });
      prisma.userSubscription.upsert.mockResolvedValue({});
    });

    it('refunds pro-rated unused portion when an employee had an active individual plan', async () => {
      // EMP1 started an individual plan 10 days ago → 20/30 unused = 2/3 of 1200.
      prisma.userSubscription.findUnique.mockImplementation(async (args: any) => {
        if (args.where?.userId === 'EMP1') {
          return {
            id: 'SUB_EMP1', status: 'active', corporateAdminId: null,
            startDate: new Date(Date.now() - 10 * 86400e3),
            plan: { price: 1200, name: 'Basic Individual' },
          };
        }
        return null;
      });

      const result = await service.enrollEmployees('ADMIN', plan.id);

      // 1200 * 20/30 = 800
      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          walletId: 'W1', type: 'credit', amount: 800,
          serviceType: 'subscription_refund',
        }),
      }));
      expect(result?.refundedIndividualPlans).toBe(1);
    });

    it('does NOT refund when employee had a corporate-paid plan (employer-level switch)', async () => {
      prisma.userSubscription.findUnique.mockImplementation(async (args: any) => {
        if (args.where?.userId === 'EMP1') {
          return {
            id: 'SUB_EMP1', status: 'active', corporateAdminId: 'OTHER_ADMIN',
            startDate: new Date(Date.now() - 10 * 86400e3),
            plan: { price: 1200, name: 'Other Corporate Plan' },
          };
        }
        return null;
      });

      const result = await service.enrollEmployees('ADMIN', plan.id);

      // Only the corporate-admin debit row; no refund.
      const refundRows = (prisma.walletTransaction.create as jest.Mock).mock.calls.filter(
        (c: any[]) => c[0].data.serviceType === 'subscription_refund',
      );
      expect(refundRows).toHaveLength(0);
      expect(result?.refundedIndividualPlans).toBe(0);
    });

    it('returns 0 refund when the prior plan is past its 30-day cycle', async () => {
      prisma.userSubscription.findUnique.mockImplementation(async (args: any) => {
        if (args.where?.userId === 'EMP1') {
          return {
            id: 'SUB_EMP1', status: 'active', corporateAdminId: null,
            startDate: new Date(Date.now() - 45 * 86400e3), // stale
            plan: { price: 1200, name: 'Basic Individual' },
          };
        }
        return null;
      });

      const result = await service.enrollEmployees('ADMIN', plan.id);
      expect(result?.refundedIndividualPlans).toBe(0);
    });
  });
});
