import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { userTypeToProfileRelation } from '../auth/auth.service';

/**
 * Generic provider service — handles ALL provider types dynamically.
 * No hardcoded role names. Profile table resolved from ProviderRole config.
 */
@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  // ─── GET /providers/:id (dynamic profile) ──────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, profileImage: true, userType: true, address: true, verified: true },
    });
    if (!user) throw new NotFoundException('Provider not found');

    const profileRelation = userTypeToProfileRelation[user.userType];
    if (!profileRelation) return user;

    // Dynamic profile fetch
    const profile = await (this.prisma as any)[profileRelation]?.findUnique?.({
      where: { userId },
    });

    return { ...user, profile };
  }

  // ─── GET /providers/:id/services ───────────────────────────────────────
  // Returns ALL active PlatformServices for this provider's role type that
  // have at least one active workflow template. Provider-specific price
  // overrides (ProviderServiceConfig.priceOverride) are applied on top.
  // Starting from PlatformService instead of ProviderServiceConfig ensures
  // every bookable service appears even if the provider hasn't customised it.

  async getServices(userId: string) {
    // 1. Resolve provider's role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true },
    });
    if (!user) return [];

    // 2. All platform services for this role with at least one active workflow
    const platformServices = await this.prisma.platformService.findMany({
      where: {
        providerType: user.userType as string,
        isActive: true,
        workflowTemplates: { some: { isActive: true } },
      },
      include: {
        workflowTemplates: {
          where: { isActive: true },
          select: { id: true, name: true, serviceMode: true, isDefault: true, steps: true },
          orderBy: { isDefault: 'desc' },
        },
      },
      orderBy: { serviceName: 'asc' },
    });

    // 3. Provider-specific price overrides (keyed by platformServiceId)
    const configs = await this.prisma.providerServiceConfig.findMany({
      where: { providerUserId: userId, isActive: true },
      select: { platformServiceId: true, priceOverride: true },
    });
    const priceMap = new Map(configs.map(c => [c.platformServiceId, c.priceOverride]));

    // 4. Merge
    const normaliseSteps = (raw: any[]) =>
      [...raw]
        .sort((a, b) => (a.stepOrder ?? a.order ?? 0) - (b.stepOrder ?? b.order ?? 0))
        .map(s => ({ order: s.stepOrder ?? s.order ?? 0, label: s.label ?? '', statusCode: s.statusCode ?? '' }));

    return platformServices.map(svc => ({
      id: svc.id,
      serviceName: svc.serviceName,
      category: svc.category,
      description: svc.description,
      price: priceMap.get(svc.id) ?? svc.defaultPrice,
      duration: svc.duration,
      workflows: svc.workflowTemplates.map(wf => ({
        id: wf.id,
        name: wf.name,
        serviceMode: wf.serviceMode,
        steps: normaliseSteps(Array.isArray(wf.steps) ? wf.steps : []),
      })),
    }));
  }

  // ─── GET /providers/:id/reviews ────────────────────────────────────────

  async getReviews(userId: string, opts: { limit?: number; offset?: number }) {
    const where = { providerUserId: userId };
    const [reviews, total, avgResult] = await Promise.all([
      this.prisma.providerReview.findMany({
        where, orderBy: { createdAt: 'desc' }, take: opts.limit || 20, skip: opts.offset || 0,
        include: { reviewerUser: { select: { firstName: true, lastName: true, profileImage: true } } },
      }),
      this.prisma.providerReview.count({ where }),
      this.prisma.providerReview.aggregate({ where, _avg: { rating: true } }),
    ]);

    // Rating distribution
    const distribution = await this.prisma.providerReview.groupBy({
      by: ['rating'], where, _count: true,
    });
    const ratingDistribution: Record<number, number> = {};
    for (const d of distribution) ratingDistribution[d.rating] = d._count;

    return { reviews, total, averageRating: avgResult._avg.rating ?? 0, ratingDistribution };
  }

  // ─── POST /providers/:id/reviews ───────────────────────────────────────

  async createReview(providerUserId: string, reviewerUserId: string, data: { rating: number; comment?: string }) {
    if (providerUserId === reviewerUserId) throw new NotFoundException('You cannot review yourself');
    const review = await this.prisma.providerReview.create({
      data: { providerUserId, reviewerUserId: reviewerUserId, rating: data.rating, comment: data.comment },
    });

    // Auto-aggregate: recalculate provider's average rating
    const aggregate = await this.prisma.providerReview.aggregate({
      where: { providerUserId },
      _avg: { rating: true },
      _count: true,
    });

    // Update the provider's profile if they have a legacy profile table with rating field
    const user = await this.prisma.user.findUnique({ where: { id: providerUserId }, select: { userType: true } });
    if (user) {
      try {
        await (this.prisma as any).doctorProfile?.update?.({
          where: { userId: providerUserId },
          data: { rating: aggregate._avg.rating ?? 0, reviewCount: aggregate._count },
        });
      } catch { /* may not be a doctor — that's OK */ }
    }

    return review;
  }

  // ─── GET /providers/:id/booking-requests ───────────────────────────────

  async getBookingRequests(providerUserId: string) {
    return this.prisma.workflowInstance.findMany({
      where: { providerUserId, cancelledAt: null, completedAt: null },
      include: { template: { select: { name: true, providerType: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ─── GET /providers/:id/schedule — generic for ANY provider type ──────

  async getSchedule(providerUserId: string) {
    return this.prisma.providerAvailability.findMany({
      where: { userId: providerUserId, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  // ─── GET /providers/:id/statistics — generic via workflow instances ────

  async getStatistics(providerUserId: string) {
    const [total, completed, pending, cancelled] = await Promise.all([
      this.prisma.workflowInstance.count({ where: { providerUserId } }),
      this.prisma.workflowInstance.count({ where: { providerUserId, completedAt: { not: null } } }),
      this.prisma.workflowInstance.count({ where: { providerUserId, currentStatus: 'pending' } }),
      this.prisma.workflowInstance.count({ where: { providerUserId, cancelledAt: { not: null } } }),
    ]);
    // Count unique patients from ServiceBooking
    const uniquePatients = await this.prisma.serviceBooking.findMany({
      where: { providerUserId }, select: { patientId: true }, distinct: ['patientId'],
    });
    return { total, completed, pending, cancelled, totalPatients: uniquePatients.length };
  }

  // ─── GET /providers/:id/patients — all patients who booked this provider ─

  async getPatients(providerUserId: string) {
    // Get unique patient IDs from ServiceBooking + legacy workflow instances
    const bookings = await this.prisma.serviceBooking.findMany({
      where: { providerUserId }, select: { patientId: true }, distinct: ['patientId'],
    });
    const patientIds = bookings.map(b => b.patientId);
    if (patientIds.length === 0) return [];

    return this.prisma.patientProfile.findMany({
      where: { id: { in: patientIds } },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, profileImage: true, phone: true } } },
    }).then(patients => patients.map(p => ({
      id: p.id, userId: p.user.id, name: `${p.user.firstName} ${p.user.lastName}`,
      email: p.user.email, profileImage: p.user.profileImage, phone: p.user.phone,
    })));
  }

  // ─── GET /providers/:id/appointments — via workflow instances ──────────

  async getAppointments(providerUserId: string, limit = 50) {
    return this.prisma.workflowInstance.findMany({
      where: { providerUserId },
      include: { template: { select: { name: true, providerType: true } } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }
}
