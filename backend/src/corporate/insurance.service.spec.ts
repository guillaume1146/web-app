import { Test, TestingModule } from '@nestjs/testing';
import { CorporateService } from './corporate.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TreasuryService } from '../shared/services/treasury.service';
import { MoneyFormatService } from '../shared/services/money-format.service';
import { ReimbursementService } from './reimbursement/reimbursement.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * Regression tests for the new insurance-company flows.
 * CORPORATE_ADMIN and INSURANCE_REP are capabilities now, not user roles —
 * these tests pin down the ownership/membership/contribution behaviour.
 */
describe('CorporateService — insurance capability', () => {
  let service: CorporateService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      corporateAdminProfile: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      corporateEmployee: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      userWallet: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      walletTransaction: { create: jest.fn() },
      user: { findUnique: jest.fn() },
      $transaction: jest.fn().mockImplementation(async (fn: any) => fn(prisma)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporateService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: { create: jest.fn(), createNotification: jest.fn() } },
        { provide: TreasuryService, useValue: {
            creditContribution: jest.fn(), payoutClaim: jest.fn(), payoutProviderDirect: jest.fn(),
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

  describe('userHasInsuranceCapability', () => {
    it('returns true when the user owns an insurance-flagged company', async () => {
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce({ id: 'P1' });
      const result = await service.userHasInsuranceCapability('U1');
      expect(result).toBe(true);
      expect(prisma.corporateAdminProfile.findFirst).toHaveBeenCalledWith({
        where: { userId: 'U1', isInsuranceCompany: true }, select: { id: true },
      });
    });

    it('falls back to legacy INSURANCE_REP userType', async () => {
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce(null);
      prisma.user.findUnique.mockResolvedValueOnce({ userType: 'INSURANCE_REP' });
      expect(await service.userHasInsuranceCapability('U1')).toBe(true);
    });

    it('returns false for a user with neither capability', async () => {
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce(null);
      prisma.user.findUnique.mockResolvedValueOnce({ userType: 'MEMBER' });
      expect(await service.userHasInsuranceCapability('U1')).toBe(false);
    });
  });

  describe('searchInsuranceCompanies', () => {
    it('filters by isInsuranceCompany: true', async () => {
      prisma.corporateAdminProfile.findMany.mockResolvedValueOnce([
        { id: 'C1', companyName: 'HealthShield' },
      ]);
      const out = await service.searchInsuranceCompanies();
      expect(prisma.corporateAdminProfile.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { isInsuranceCompany: true },
      }));
      expect(out).toHaveLength(1);
    });

    it('applies case-insensitive name filter when q is provided', async () => {
      prisma.corporateAdminProfile.findMany.mockResolvedValueOnce([]);
      await service.searchInsuranceCompanies('Shield');
      expect(prisma.corporateAdminProfile.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { isInsuranceCompany: true, companyName: { contains: 'Shield', mode: 'insensitive' } },
      }));
    });
  });

  describe('joinInsuranceCompany', () => {
    const company = { id: 'C1', companyName: 'Shield', userId: 'OWNER', monthlyContribution: 500 };

    it('throws if the company is not an insurance company', async () => {
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce(null);
      await expect(service.joinInsuranceCompany('U1', 'C1')).rejects.toThrow(NotFoundException);
    });

    it('throws if the user is the owner of the company', async () => {
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce(company);
      await expect(service.joinInsuranceCompany('OWNER', 'C1')).rejects.toThrow(BadRequestException);
    });

    it('throws on insufficient wallet balance', async () => {
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce(company);
      prisma.userWallet.findUnique.mockResolvedValueOnce({ id: 'W1', balance: 100 });
      await expect(service.joinInsuranceCompany('U1', 'C1')).rejects.toThrow(BadRequestException);
    });

    it('deducts the contribution from the wallet and upserts membership', async () => {
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce(company);
      prisma.userWallet.findUnique.mockResolvedValueOnce({ id: 'W1', balance: 10000 });
      prisma.corporateEmployee.upsert.mockResolvedValueOnce({ id: 'M1', status: 'active' });

      const result = await service.joinInsuranceCompany('U1', 'C1');
      expect(prisma.userWallet.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'W1' },
        data: { balance: { decrement: 500 } },
      }));
      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ amount: 500, type: 'debit' }),
      }));
      expect(prisma.corporateEmployee.upsert).toHaveBeenCalled();
      expect(result.id).toBe('M1');
    });
  });

  describe('getInsuranceMembersStatus', () => {
    it('flags members who paid this month as paidThisMonth: true', async () => {
      const ym = new Date().toISOString().slice(0, 7);
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce({
        id: 'C1', companyName: 'Shield', monthlyContribution: 500, userId: 'OWNER',
      });
      prisma.corporateEmployee.findMany.mockResolvedValueOnce([
        {
          id: 'M1', userId: 'U1', joinedAt: new Date(),
          lastContributionMonth: ym, lastContributionAt: new Date(),
          user: { firstName: 'A', lastName: 'B', email: 'a@b' },
        },
        {
          id: 'M2', userId: 'U2', joinedAt: new Date(),
          lastContributionMonth: '2025-01', lastContributionAt: new Date('2025-01-15'),
          user: { firstName: 'C', lastName: 'D', email: 'c@d' },
        },
      ]);

      const result = await service.getInsuranceMembersStatus('OWNER');
      expect(result.summary.total).toBe(2);
      expect(result.summary.paid).toBe(1);
      expect(result.summary.unpaid).toBe(1);
      expect(result.summary.collectedRevenue).toBe(500);
      expect(result.summary.expectedRevenue).toBe(1000);
      expect(result.members[0].paidThisMonth).toBe(true);
      expect(result.members[1].paidThisMonth).toBe(false);
    });

    it('throws if the caller does not own an insurance company', async () => {
      prisma.corporateAdminProfile.findFirst.mockResolvedValueOnce(null);
      await expect(service.getInsuranceMembersStatus('X')).rejects.toThrow(NotFoundException);
    });
  });
});
