import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditService } from '../shared/services/admin-audit.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private audit: AdminAuditService,
  ) {}

  async getStats() {
    const [userCount, providerCount, appointmentCount, activeSubscriptions] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { userType: { notIn: ['MEMBER' as any, 'CORPORATE_ADMIN' as any, 'INSURANCE_REP' as any] } } }),
      this.prisma.appointment.count(),
      this.prisma.userSubscription.count({ where: { status: 'active' } }),
    ]);
    return { userCount, providerCount, appointmentCount, activeSubscriptions };
  }

  async getDashboard() {
    const [totalUsers, pending, revenue, sessions] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { accountStatus: 'pending' } }),
      this.prisma.walletTransaction.aggregate({ where: { type: 'debit', status: 'completed' }, _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } })),
      this.prisma.videoCallSession.count({ where: { status: 'active' } }).catch(() => 0),
    ]);

    const categories = await this.prisma.user.groupBy({ by: ['userType'], _count: true, where: { accountStatus: 'active' } });
    const categoryStats = categories.map(c => ({ category: c.userType, count: c._count, active: c._count, pending: 0 }));

    const recent = await this.prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { type: true, message: true, createdAt: true } });
    const recentActivity = recent.map(n => ({ type: n.type, message: n.message, time: n.createdAt }));

    return {
      stats: { totalUsers, pendingValidations: pending, monthlyRevenue: revenue._sum?.amount || 0, activeSessions: sessions },
      categoryStats,
      recentActivity,
    };
  }

  async getRequiredDocuments() {
    const configs = await this.prisma.requiredDocumentConfig.findMany({ orderBy: [{ userType: 'asc' }, { documentName: 'asc' }] });
    const grouped: Record<string, Array<{ documentName: string; required: boolean }>> = {};
    for (const c of configs) {
      if (!grouped[c.userType]) grouped[c.userType] = [];
      grouped[c.userType].push({ documentName: c.documentName, required: c.required });
    }
    return { grouped, raw: configs };
  }

  async updateRequiredDocuments(configs: Array<{ userType: string; documentName: string; required: boolean }>) {
    return this.prisma.$transaction(
      configs.map(c => this.prisma.requiredDocumentConfig.upsert({
        where: { userType_documentName: { userType: c.userType, documentName: c.documentName } },
        update: { required: c.required },
        create: { userType: c.userType, documentName: c.documentName, required: c.required },
      })),
    );
  }

  // ─── Document verification queue ────────────────────────────────────────

  async listPendingDocuments(limit: number) {
    return this.prisma.document.findMany({
      where: { verificationStatus: 'pending' },
      orderBy: { uploadedAt: 'asc' },
      take: limit,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, userType: true, profileImage: true },
        },
      },
    });
  }

  async reviewDocument(
    documentId: string,
    decision: 'approved' | 'rejected',
    reviewerId: string,
    rejectionReason?: string,
  ) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { userId: true, name: true, type: true },
    });
    if (!doc) throw new Error('Document not found');

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        verificationStatus: decision,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        rejectionReason: decision === 'rejected' ? (rejectionReason || 'Please re-upload') : null,
      },
    });

    await this.audit.log({
      adminId: reviewerId,
      action: decision === 'approved' ? 'document.approve' : 'document.reject',
      targetType: 'Document',
      targetId: documentId,
      details: { ownerId: doc.userId, docType: doc.type, docName: doc.name, reason: rejectionReason ?? null },
    });

    // When every required document is approved, flip the user's verified flag.
    if (decision === 'approved') {
      const hasPending = await this.prisma.document.findFirst({
        where: { userId: doc.userId, verificationStatus: { in: ['pending', 'rejected'] } },
        select: { id: true },
      });
      if (!hasPending) {
        await this.prisma.user.update({
          where: { id: doc.userId },
          data: { verified: true, accountStatus: 'active' },
        });
      }
    }

    return updated;
  }

  async listAccounts(params: { status?: string; page: number; limit: number }) {
    const { status, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status === 'unverified') {
      where.verified = false;
      where.userType = { notIn: ['ADMIN', 'REGIONAL_ADMIN'] as any[] };
    } else if (status === 'verified') {
      where.verified = true;
    } else if (status && ['active', 'pending', 'suspended', 'rejected'].includes(status)) {
      where.accountStatus = status;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, firstName: true, lastName: true, email: true,
          userType: true, accountStatus: true, verified: true, phone: true, createdAt: true,
          subscription: { select: { id: true, status: true, plan: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateAccountStatus(userId: string, action: 'approve' | 'suspend' | 'reject', adminId?: string) {
    const newStatus = action === 'approve' ? 'active' : action === 'reject' ? 'rejected' : 'suspended';
    const before = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountStatus: true },
    });
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus: newStatus, ...(action === 'approve' ? { verified: true } : {}) },
      select: { id: true, firstName: true, lastName: true, email: true, accountStatus: true, verified: true },
    });
    if (adminId) {
      await this.audit.log({
        adminId,
        action: action === 'approve' ? 'account.approve' : action === 'reject' ? 'account.reject' : 'account.suspend',
        targetType: 'User',
        targetId: userId,
        details: { before: before?.accountStatus, after: newStatus },
      });
    }
    return updated;
  }

  async listAdmins() {
    return this.prisma.user.findMany({
      where: { userType: 'REGIONAL_ADMIN' as any },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        accountStatus: true, createdAt: true,
        regionalAdminProfile: { select: { id: true, region: true, country: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAlerts() {
    const alerts: Array<{ type: string; message: string; time: Date; severity: string }> = [];

    const pendingCount = await this.prisma.user.count({ where: { accountStatus: 'pending' } });
    if (pendingCount > 0) {
      alerts.push({ type: 'pending_users', message: `${pendingCount} user(s) pending approval`, time: new Date(), severity: 'warning' });
    }

    const lowStockItems = await this.prisma.providerInventoryItem.count({ where: { quantity: { lte: 5 }, isActive: true } }).catch(() => 0);
    if (lowStockItems > 0) {
      alerts.push({ type: 'low_stock', message: `${lowStockItems} inventory item(s) with low stock`, time: new Date(), severity: 'warning' });
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringSubs = await this.prisma.userSubscription.count({
      where: { status: 'active', endDate: { lte: thirtyDaysFromNow } },
    }).catch(() => 0);
    if (expiringSubs > 0) {
      alerts.push({ type: 'expiring_subscriptions', message: `${expiringSubs} subscription(s) expiring within 30 days`, time: new Date(), severity: 'info' });
    }

    return alerts;
  }

  async getCommissionConfig() {
    const config = await this.prisma.platformConfig.findFirst();
    if (!config) {
      return { platformCommissionRate: 15, providerRate: 85, providerCommissionRate: 85, regionalCommissionRate: 0, currency: 'MUR', trialWalletAmount: 4500 };
    }
    return {
      platformCommissionRate: config.platformCommissionRate,
      providerRate: config.providerCommissionRate,
      providerCommissionRate: config.providerCommissionRate,
      regionalCommissionRate: config.regionalCommissionRate,
      currency: config.currency,
      trialWalletAmount: config.trialWalletAmount,
    };
  }

  async updateCommissionConfig(platformCommissionRate: number, providerRate: number, currency?: string, trialWalletAmount?: number) {
    const existing = await this.prisma.platformConfig.findFirst();
    const data: Record<string, unknown> = {
      platformCommissionRate,
      providerCommissionRate: providerRate,
      ...(currency !== undefined && { currency }),
      ...(trialWalletAmount !== undefined && { trialWalletAmount }),
    };

    if (existing) {
      return this.prisma.platformConfig.update({ where: { id: existing.id }, data });
    }
    return this.prisma.platformConfig.create({ data: { ...data, regionalCommissionRate: 0 } as any });
  }

  async getMetrics() {
    const [users, bookings, revenueAgg, activeSessions] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.appointment.count(),
      this.prisma.walletTransaction.aggregate({ where: { type: 'debit', status: 'completed' }, _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } })),
      this.prisma.videoCallSession.count({ where: { status: 'active' } }).catch(() => 0),
    ]);

    const recentNotifs = await this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' }, take: 10,
      select: { type: true, message: true, createdAt: true },
    });
    const recentActivity = recentNotifs.map(n => ({ type: n.type, message: n.message, time: n.createdAt }));

    return { users, bookings, revenue: revenueAgg._sum?.amount || 0, activeSessions, recentActivity };
  }

  async getPlatformCommission() {
    const [totalCommission, totalRegional, totalVolume, transactionCount] = await Promise.all([
      this.prisma.walletTransaction.aggregate({
        where: { platformCommission: { not: null, gt: 0 } },
        _sum: { platformCommission: true },
      }).catch(() => ({ _sum: { platformCommission: 0 } })),
      this.prisma.walletTransaction.aggregate({
        where: { regionalCommission: { not: null, gt: 0 } },
        _sum: { regionalCommission: true },
      }).catch(() => ({ _sum: { regionalCommission: 0 } })),
      this.prisma.walletTransaction.aggregate({
        where: { platformCommission: { not: null, gt: 0 } },
        _sum: { amount: true },
      }).catch(() => ({ _sum: { amount: 0 } })),
      this.prisma.walletTransaction.count({
        where: { platformCommission: { not: null, gt: 0 } },
      }).catch(() => 0),
    ]);

    const recentTransactions = await this.prisma.walletTransaction.findMany({
      where: { platformCommission: { not: null, gt: 0 } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, amount: true, platformCommission: true, regionalCommission: true,
        providerAmount: true, description: true, serviceType: true, createdAt: true,
      },
    });

    const admins = await this.prisma.user.findMany({
      where: { userType: 'REGIONAL_ADMIN' as any, accountStatus: 'active' },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        regionalAdminProfile: { select: { region: true, country: true } },
      },
    }).catch(() => []);

    const regionalAdmins = await Promise.all(
      admins.map(async (a) => {
        const adminCommission = await this.prisma.walletTransaction.aggregate({
          where: { regionalCommission: { not: null, gt: 0 } },
          _sum: { regionalCommission: true },
        }).catch(() => ({ _sum: { regionalCommission: 0 } }));

        const total = adminCommission._sum?.regionalCommission || 0;
        const share = admins.length > 0 ? total / admins.length : 0;

        return {
          id: a.id,
          name: `${a.firstName} ${a.lastName}`,
          email: a.email,
          region: a.regionalAdminProfile?.region || '',
          country: a.regionalAdminProfile?.country || '',
          commissionRate: 0,
          totalCommission: Math.round(share * 100) / 100,
        };
      }),
    );

    return {
      totalPlatformCommission: totalCommission._sum?.platformCommission || 0,
      totalRegionalCommission: totalRegional._sum?.regionalCommission || 0,
      totalTransactionVolume: totalVolume._sum?.amount || 0,
      transactionCount,
      recentTransactions,
      regionalAdmins,
    };
  }

  async getRegionalActivity() {
    const regions = await this.prisma.region.findMany({
      select: { id: true, name: true, countryCode: true },
    });

    return Promise.all(
      regions.map(async (region) => {
        const activeUsers = await this.prisma.user.count({
          where: { accountStatus: 'active', regionId: region.id },
        }).catch(() => 0);

        const wallets = await this.prisma.userWallet.findMany({
          where: { user: { regionId: region.id } },
          select: { id: true },
        }).catch(() => []);
        const walletIds = wallets.map(w => w.id);

        let transactions = 0;
        let revenue = 0;
        if (walletIds.length > 0) {
          const agg = await this.prisma.walletTransaction.aggregate({
            where: { walletId: { in: walletIds }, status: 'completed' },
            _count: true,
            _sum: { amount: true },
          }).catch(() => ({ _count: 0, _sum: { amount: 0 } }));
          transactions = agg._count;
          revenue = agg._sum?.amount || 0;
        }

        return { region: region.name, code: region.countryCode, activeUsers, transactions, revenue };
      }),
    );
  }

  async getSecurityOverview() {
    const [totalUsers, suspendedAccounts, pendingAccounts, activeAccounts] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { accountStatus: 'suspended' } }),
      this.prisma.user.count({ where: { accountStatus: 'pending' } }),
      this.prisma.user.count({ where: { accountStatus: 'active' } }),
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentRegistrations = await this.prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    return { totalUsers, activeAccounts, suspendedAccounts, pendingAccounts, recentRegistrations };
  }

  async getSystemHealth() {
    const dbStart = Date.now();
    const totalUsers = await this.prisma.user.count();
    const dbLatency = Date.now() - dbStart;

    const memUsage = process.memoryUsage();
    const memUsedMb = Math.round(memUsage.rss / (1024 * 1024));
    const memoryUsage = Math.min(100, Math.round((memUsedMb / 1024) * 100));
    const cpuUsage = Math.min(100, Math.round(dbLatency * 2));

    const services = [
      { name: 'database', status: 'healthy', latency: dbLatency, responseTime: dbLatency },
    ];

    const activeUsers = await this.prisma.user.count({ where: { accountStatus: 'active' } });
    const overallHealth = services.every(s => s.status === 'healthy') ? 'healthy' : 'degraded';

    return {
      services,
      overallHealth,
      totalUsers,
      activeUsers,
      performance: { cpuUsage, memoryUsage, memoryUsedMb: memUsedMb },
    };
  }

  async getRegions() {
    return this.prisma.region.findMany({
      select: { id: true, name: true, countryCode: true, currency: true, currencySymbol: true },
      orderBy: { name: 'asc' },
    });
  }

  async getRoleConfig() {
    return this.prisma.providerRole.findMany({ orderBy: { label: 'asc' } });
  }

  async updateRoleConfig(id: string, data: any) {
    return this.prisma.providerRole.update({ where: { id }, data });
  }
}
