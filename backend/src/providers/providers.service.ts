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
  // Returns active PlatformServices for this provider with their attached
  // workflow templates.
  //
  // Workflow resolution (most-specific wins):
  //   1. Provider explicitly attached templates via ProviderServiceWorkflow
  //      → use exactly those (respects per-provider appointment type choice)
  //   2. Service-specific templates (WorkflowTemplate.platformServiceId = svc.id)
  //      for this provider type created by system or regional admin
  //   3. Generic templates (platformServiceId = null) for this provider type
  //      (system defaults + regional admin)
  //
  // Only services where the provider has a ProviderServiceConfig are returned
  // (the provider must have opted in to offer the service).

  async getServices(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true, regionId: true },
    });
    if (!user) return [];

    // Provider's service configs — the source of truth for "what does this provider offer"
    // Cast to any[] because the Prisma client may not yet reflect the new
    // ProviderServiceWorkflow relation (regenerated in CI after schema push).
    const configs: any[] = await (this.prisma.providerServiceConfig as any).findMany({
      where: { providerUserId: userId, isActive: true },
      select: {
        platformServiceId: true,
        priceOverride: true,
        workflowTemplates: {
          select: {
            workflowTemplate: {
              select: { id: true, name: true, serviceMode: true, steps: true, isActive: true },
            },
          },
        },
      },
    });

    if (configs.length === 0) return [];

    // Fetch the platform service details for all opted-in services
    const svcIds = configs.map(c => c.platformServiceId);
    const platformServices = await this.prisma.platformService.findMany({
      where: { id: { in: svcIds }, isActive: true },
      orderBy: { serviceName: 'asc' },
    });

    // Fallback templates — used when a config has no explicitly attached workflows.
    // Fetch once: service-specific + generic for this provider type, from system & regional admin.
    const fallbackTemplates = await this.prisma.workflowTemplate.findMany({
      where: {
        isActive: true,
        providerType: user.userType as string,
        createdByProviderId: null,   // system or regional admin only
        OR: [
          { platformServiceId: { in: svcIds } },  // service-specific
          { platformServiceId: null },              // generic for this role
        ],
      },
      select: { id: true, name: true, serviceMode: true, steps: true, platformServiceId: true },
      orderBy: [{ platformServiceId: 'desc' }, { isDefault: 'desc' }, { serviceMode: 'asc' }],
    });

    // Build maps for fast lookup
    const configMap = new Map(configs.map(c => [c.platformServiceId, c]));
    const svcSpecificFallback = new Map<string, typeof fallbackTemplates>();
    const genericFallback: typeof fallbackTemplates = [];
    for (const t of fallbackTemplates) {
      if (t.platformServiceId) {
        const list = svcSpecificFallback.get(t.platformServiceId) ?? [];
        list.push(t);
        svcSpecificFallback.set(t.platformServiceId, list);
      } else {
        genericFallback.push(t);
      }
    }

    const normaliseSteps = (raw: any[]) =>
      [...raw]
        .sort((a, b) => (a.stepOrder ?? a.order ?? 0) - (b.stepOrder ?? b.order ?? 0))
        .map(s => ({ order: s.stepOrder ?? s.order ?? 0, label: s.label ?? '', statusCode: s.statusCode ?? '' }))
        .filter(s => s.label);

    const toWorkflow = (wf: { id: string; name: string; serviceMode: string; steps: any }) => ({
      id: wf.id,
      name: wf.name,
      serviceMode: wf.serviceMode,
      steps: normaliseSteps(Array.isArray(wf.steps) ? wf.steps : []),
    });

    return platformServices.map(svc => {
      const config = configMap.get(svc.id);
      const price = config?.priceOverride ?? svc.defaultPrice;

      // Priority 1: workflows explicitly attached by the provider for this service
      const explicitWorkflows = (config?.workflowTemplates ?? [])
        .map(link => link.workflowTemplate)
        .filter(wt => wt.isActive);

      // Priority 2: service-specific system/admin templates
      const svcFallback = svcSpecificFallback.get(svc.id) ?? [];

      // Priority 3: generic role templates
      const workflows = explicitWorkflows.length > 0
        ? explicitWorkflows.map(toWorkflow)
        : svcFallback.length > 0
          ? svcFallback.map(toWorkflow)
          : genericFallback.map(toWorkflow);

      return {
        id: svc.id,
        serviceName: svc.serviceName,
        category: svc.category,
        description: svc.description,
        price,
        duration: svc.duration,
        workflows,
      };
    });
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
