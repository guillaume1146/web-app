import { LedgerReconciliationService } from './ledger-reconciliation.service';

describe('LedgerReconciliationService', () => {
  let service: LedgerReconciliationService;
  let prisma: any;
  let notifications: any;

  beforeEach(() => {
    prisma = {
      userWallet: { findMany: jest.fn().mockResolvedValue([]) },
      walletTransaction: { aggregate: jest.fn() },
      insuranceCompanyTreasury: { findMany: jest.fn().mockResolvedValue([]) },
      treasuryTransaction: { aggregate: jest.fn() },
      platformTreasury: { findFirst: jest.fn().mockResolvedValue(null) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    notifications = { createNotification: jest.fn().mockResolvedValue({}) };
    service = new LedgerReconciliationService(prisma, notifications);
  });

  describe('wallet checks', () => {
    it('reports no drift when ledger sum matches balance', async () => {
      prisma.userWallet.findMany.mockResolvedValueOnce([
        { id: 'W1', userId: 'U1', balance: 1000 },
      ]);
      // 1500 credit - 500 debit = 1000 — matches balance exactly.
      prisma.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 1500 } }) // credits
        .mockResolvedValueOnce({ _sum: { amount: 500 } }); // debits

      const out = await service.reconcile();
      expect(out.walletDrifts).toHaveLength(0);
      expect(out.walletsChecked).toBe(1);
    });

    it('flags a wallet where balance is > ledger sum (money appeared from nowhere)', async () => {
      prisma.userWallet.findMany.mockResolvedValueOnce([
        { id: 'W1', userId: 'U1', balance: 5000 },
      ]);
      prisma.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 3000 } })
        .mockResolvedValueOnce({ _sum: { amount: 500 } }); // ledger sum = 2500

      const out = await service.reconcile();
      expect(out.walletDrifts).toHaveLength(1);
      expect(out.walletDrifts[0]).toMatchObject({
        walletId: 'W1', balance: 5000, ledgerSum: 2500, delta: 2500,
      });
    });

    it('flags a wallet where balance is < ledger sum (money vanished)', async () => {
      prisma.userWallet.findMany.mockResolvedValueOnce([
        { id: 'W1', userId: 'U1', balance: 1000 },
      ]);
      prisma.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 2000 } })
        .mockResolvedValueOnce({ _sum: { amount: 0 } });

      const out = await service.reconcile();
      expect(out.walletDrifts[0].delta).toBe(-1000);
    });

    it('accepts floating-point slop under 0.01', async () => {
      prisma.userWallet.findMany.mockResolvedValueOnce([
        { id: 'W1', userId: 'U1', balance: 999.995 },
      ]);
      prisma.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 1000 } })
        .mockResolvedValueOnce({ _sum: { amount: 0 } });

      const out = await service.reconcile();
      expect(out.walletDrifts).toHaveLength(0);
    });

    it('handles wallets with no ledger rows (fresh user, but balance should be 0)', async () => {
      prisma.userWallet.findMany.mockResolvedValueOnce([
        { id: 'W1', userId: 'U1', balance: 4500 },
      ]);
      prisma.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });

      // Expected drift: wallet has 4500 credit but no ledger → pre-ledger bug
      // that was fixed in April 2026 audit (trial balance now writes a row).
      const out = await service.reconcile();
      expect(out.walletDrifts[0].delta).toBe(4500);
    });
  });

  describe('treasury checks', () => {
    it('excludes platform_fee marker rows from company-treasury ledger sum', async () => {
      prisma.insuranceCompanyTreasury.findMany.mockResolvedValueOnce([
        { id: 'T1', companyProfileId: 'C1', balance: 950 },
      ]);
      // contributions only (no platform_fee marker counted).
      prisma.treasuryTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 950 } })  // contributions
        .mockResolvedValueOnce({ _sum: { amount: 0 } });   // payouts

      const out = await service.reconcile();
      expect(out.treasuryDrifts).toHaveLength(0);
    });

    it('flags platform treasury drift independently', async () => {
      prisma.platformTreasury.findFirst.mockResolvedValueOnce({ id: 'PT1', balance: 500 });
      prisma.treasuryTransaction.aggregate.mockResolvedValueOnce({ _sum: { amount: 450 } });

      const out = await service.reconcile();
      expect(out.platformDrift).toEqual({ balance: 500, ledgerSum: 450, delta: 50 });
    });

    it('returns null for platformDrift when no PlatformTreasury exists yet', async () => {
      const out = await service.reconcile();
      expect(out.platformDrift).toBeNull();
    });
  });

  describe('runNightlySweep', () => {
    it('notifies regional admins when drift is detected', async () => {
      prisma.userWallet.findMany.mockResolvedValueOnce([
        { id: 'W1', userId: 'U1', balance: 9999 },
      ]);
      prisma.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 100 } })
        .mockResolvedValueOnce({ _sum: { amount: 0 } });
      prisma.user.findMany.mockResolvedValueOnce([{ id: 'ADMIN1' }, { id: 'ADMIN2' }]);

      await service.runNightlySweep();

      expect(notifications.createNotification).toHaveBeenCalledTimes(2);
      expect(notifications.createNotification).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'ADMIN1',
        type: 'ledger_drift_alert',
      }));
    });

    it('sends no notifications on a clean sweep', async () => {
      await service.runNightlySweep();
      expect(notifications.createNotification).not.toHaveBeenCalled();
    });
  });
});
