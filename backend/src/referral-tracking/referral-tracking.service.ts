import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReferralTrackingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Every user is a referral partner — capability, not role. On first access
   * we lazy-create a profile with a short unique code so the dashboard never
   * returns an empty state.
   */
  async ensureReferralProfile(userId: string) {
    const existing = await this.prisma.referralPartnerProfile.findUnique({
      where: { userId },
      select: { id: true, referralCode: true, commissionRate: true, businessType: true,
                totalReferrals: true, totalCommissionEarned: true },
    });
    if (existing) return existing;

    // Generate a short human-friendly code like "ABC123" — retry on the
    // astronomically-unlikely collision.
    const makeCode = () => {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 ambiguity
      let c = '';
      for (let i = 0; i < 6; i++) c += alphabet[Math.floor(Math.random() * alphabet.length)];
      return c;
    };
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode();
      try {
        return await this.prisma.referralPartnerProfile.create({
          data: {
            userId,
            referralCode: code,
            businessType: 'individual',
            commissionRate: 10, // 10% — every user gets the default tier
          },
          select: { id: true, referralCode: true, commissionRate: true, businessType: true,
                    totalReferrals: true, totalCommissionEarned: true },
        });
      } catch (_) { /* collision — retry */ }
    }
    throw new Error('Unable to generate a unique referral code');
  }

  async track(body: { referralCode: string; source?: string; medium?: string }) {
    const partner = await this.prisma.referralPartnerProfile.findUnique({ where: { referralCode: body.referralCode } });
    if (!partner) return { error: 'Invalid referral code' };
    const click = await this.prisma.referralClick.create({
      data: {
        referralPartnerId: partner.id,
        referralCode: body.referralCode,
        source: body.source,
        medium: body.medium,
        utmSource: body.source,
        utmMedium: body.medium,
      },
    });
    return { data: { trackingId: click.id } };
  }

  async getDashboard(userId: string) {
    // Lazy-provision so every authenticated user has a working referral
    // code without a separate "claim your code" step.
    const profile = await this.ensureReferralProfile(userId);

    if (!profile) {
      return {
        stats: {
          referralCode: '',
          totalEarnings: 0,
          totalReferrals: 0,
          conversionRate: 0,
          thisMonthEarnings: 0,
          thisMonthReferrals: 0,
          pendingPayouts: 0,
        },
        recentConversions: [],
        leadsBySource: [],
      };
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalClicks, convertedClicks, thisMonthClicks, thisMonthConverted, recentConverted, sourceGroups] = await Promise.all([
      this.prisma.referralClick.count({ where: { referralPartnerId: profile.id } }).catch(() => 0),
      this.prisma.referralClick.count({ where: { referralPartnerId: profile.id, converted: true } }).catch(() => 0),
      this.prisma.referralClick.count({
        where: { referralPartnerId: profile.id, createdAt: { gte: startOfMonth } },
      }).catch(() => 0),
      // Conversions inside the current month (used for thisMonthEarnings)
      this.prisma.referralClick.count({
        where: { referralPartnerId: profile.id, converted: true, convertedAt: { gte: startOfMonth } },
      }).catch(() => 0),
      this.prisma.referralClick.findMany({
        where: { referralPartnerId: profile.id, converted: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, convertedUserId: true, convertedAt: true, createdAt: true,
          source: true, utmSource: true,
        },
      }).catch(() => [] as any[]),
      this.prisma.referralClick.groupBy({
        by: ['source'],
        where: { referralPartnerId: profile.id },
        _count: true,
      }).catch(() => []),
    ]);

    // Build recentConversions with user details
    const recentConversions: { id: string; firstName: string; lastName: string; userType: string; createdAt: string }[] = [];
    for (const click of recentConverted) {
      if (click.convertedUserId) {
        const user = await this.prisma.user.findUnique({
          where: { id: click.convertedUserId },
          select: { id: true, firstName: true, lastName: true, userType: true, createdAt: true },
        });
        if (user) {
          recentConversions.push({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            userType: user.userType,
            createdAt: (click.convertedAt || click.createdAt).toISOString(),
          });
        }
      }
    }

    // Build leadsBySource in the format the frontend expects (LeadSourceData[])
    const convertedBySource = await this.prisma.referralClick.groupBy({
      by: ['source'],
      where: { referralPartnerId: profile.id, converted: true },
      _count: true,
    }).catch(() => []);

    const convertedMap: Record<string, number> = {};
    for (const g of convertedBySource) {
      convertedMap[g.source || 'direct'] = g._count;
    }

    const leadsBySource = sourceGroups
      .map((g: any) => {
        const sourceName = g.source || 'direct';
        const visitors = g._count;
        const conversions = convertedMap[sourceName] || 0;
        const conversionRate = visitors > 0 ? Math.round((conversions / visitors) * 100) : 0;
        return {
          source: sourceName.charAt(0).toUpperCase() + sourceName.slice(1),
          visitors,
          conversions,
          conversionRate,
          earnings: conversions * 100, // Rs 100 per conversion (matches frontend assumption)
          utmLink: '',
        };
      })
      .sort((a: any, b: any) => b.visitors - a.visitors)
      .slice(0, 10);

    const conversionRate = totalClicks > 0 ? Math.round((convertedClicks / totalClicks) * 100) : 0;

    // Per-conversion commission (Rs 100) — kept consistent with the leadsBySource map above.
    const commissionPerConversion = 100;
    const thisMonthEarnings = thisMonthConverted * commissionPerConversion;

    // Pending payouts = converted clicks that have not yet been settled into the
    // partner's wallet. We approximate "settled" as totalCommissionEarned;
    // anything beyond that is pending.
    const lifetimeEarnings = convertedClicks * commissionPerConversion;
    const pendingPayouts = Math.max(0, lifetimeEarnings - (profile.totalCommissionEarned || 0));

    return {
      stats: {
        referralCode: profile.referralCode,
        totalEarnings: profile.totalCommissionEarned || 0,
        totalReferrals: profile.totalReferrals || totalClicks,
        conversionRate,
        thisMonthEarnings,
        thisMonthReferrals: thisMonthClicks,
        pendingPayouts,
      },
      recentConversions,
      leadsBySource,
    };
  }
}
