import { TreasuryService } from './treasury.service';

/**
 * TreasuryService is the money-movement layer for insurance companies —
 * every Health Credit flow (contributions in, claim payouts out, platform
 * fees) goes through here. Mock Prisma fully; the checks we care about
 * are the sequence and amounts of writes.
 */
describe('TreasuryService', () => {
  let service: TreasuryService;
  let tx: any;

  beforeEach(() => {
    process.env.MEDIWYZ_PLATFORM_FEE_PERCENT = '5';
    service = new TreasuryService({} as any);
    tx = {
      platformTreasury: {
        findFirst: jest.fn().mockResolvedValue({ id: 'PT1', balance: 0 }),
        create: jest.fn(),
        update: jest.fn(),
      },
      insuranceCompanyTreasury: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      treasuryTransaction: { create: jest.fn() },
      userWallet: { findUnique: jest.fn(), update: jest.fn() },
      walletTransaction: { create: jest.fn() },
    };
  });

  describe('creditContribution', () => {
    it('routes 95% to treasury, 5% to platform (default fee)', async () => {
      tx.insuranceCompanyTreasury.findUnique.mockResolvedValueOnce({
        id: 'T1', companyProfileId: 'C1', balance: 0,
      });

      await service.creditContribution(tx, {
        companyProfileId: 'C1', memberId: 'M1',
        amount: 1000, description: 'First month',
      });

      // Treasury gets 950.
      expect(tx.insuranceCompanyTreasury.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'T1' },
        data: expect.objectContaining({
          balance: 950,
          totalInflow: { increment: 950 },
        }),
      }));

      // Platform gets 50.
      expect(tx.platformTreasury.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'PT1' },
        data: { balance: 50 },
      }));

      // Three ledger entries: company contribution + platform-side fee + company-side fee marker.
      expect(tx.treasuryTransaction.create).toHaveBeenCalledTimes(3);
    });

    it('auto-creates the treasury if missing', async () => {
      tx.insuranceCompanyTreasury.findUnique.mockResolvedValueOnce(null);
      tx.insuranceCompanyTreasury.create.mockResolvedValueOnce({
        id: 'T1', companyProfileId: 'C1', balance: 0,
      });

      await service.creditContribution(tx, {
        companyProfileId: 'C1', memberId: 'M1',
        amount: 100, description: 'Join',
      });

      expect(tx.insuranceCompanyTreasury.create).toHaveBeenCalledWith({
        data: { companyProfileId: 'C1', balance: 0 },
      });
    });

    it('is a no-op for zero or negative amounts', async () => {
      await service.creditContribution(tx, {
        companyProfileId: 'C1', memberId: 'M1',
        amount: 0, description: 'x',
      });
      expect(tx.insuranceCompanyTreasury.update).not.toHaveBeenCalled();
    });
  });

  describe('payoutClaim', () => {
    it('debits treasury and credits member wallet for the same amount', async () => {
      tx.insuranceCompanyTreasury.findUnique.mockResolvedValueOnce({
        id: 'T1', companyProfileId: 'C1', balance: 5000,
      });
      tx.userWallet.findUnique.mockResolvedValueOnce({ id: 'W1', balance: 100 });

      await service.payoutClaim(tx, {
        companyProfileId: 'C1', memberId: 'M1', claimId: 'CL1',
        amount: 400, description: 'Claim payout',
      });

      expect(tx.insuranceCompanyTreasury.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'T1' },
        data: { balance: 4600, totalOutflow: { increment: 400 } },
      }));
      expect(tx.userWallet.update).toHaveBeenCalledWith({
        where: { id: 'W1' }, data: { balance: 500 },
      });
      expect(tx.walletTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: 'credit', amount: 400 }),
      }));
    });

    it('refuses payout when treasury has insufficient funds', async () => {
      tx.insuranceCompanyTreasury.findUnique.mockResolvedValueOnce({
        id: 'T1', companyProfileId: 'C1', balance: 50,
      });
      await expect(service.payoutClaim(tx, {
        companyProfileId: 'C1', memberId: 'M1', claimId: 'CL1',
        amount: 400, description: 'x',
      })).rejects.toThrow(/insufficient funds/i);
      expect(tx.userWallet.update).not.toHaveBeenCalled();
    });
  });

  describe('payoutProviderDirect', () => {
    it('credits provider wallet directly for tiers payant', async () => {
      tx.insuranceCompanyTreasury.findUnique.mockResolvedValueOnce({
        id: 'T1', companyProfileId: 'C1', balance: 5000,
      });
      tx.userWallet.findUnique.mockResolvedValueOnce({ id: 'PW1', balance: 0 });

      await service.payoutProviderDirect(tx, {
        companyProfileId: 'C1', providerId: 'DR1', claimId: 'CL1',
        amount: 1200, description: 'Tiers payant',
      });

      expect(tx.userWallet.update).toHaveBeenCalledWith({
        where: { id: 'PW1' }, data: { balance: 1200 },
      });
      // Treasury logged 'direct_billing' type.
      expect(tx.treasuryTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: 'direct_billing' }),
      }));
    });
  });
});
