import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InsuranceService {
  constructor(private prisma: PrismaService) {}

  async getClaims(userId: string, page: number, limit: number) {
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;
    const where = { OR: [{ insuranceRepId: userId }, { patient: { userId } }] };

    const [claims, total] = await Promise.all([
      this.prisma.insuranceClaim.findMany({
        where,
        include: { patient: { include: { user: { select: { firstName: true, lastName: true, email: true } } } }, plan: true },
        orderBy: { submittedDate: 'desc' }, take, skip,
      }),
      this.prisma.insuranceClaim.count({ where }),
    ]);

    return { data: claims, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async createClaim(userId: string, body: { policyHolderName?: string; description?: string; policyType?: string; claimAmount?: number; planId?: string }) {
    const profile = await this.prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) throw new NotFoundException('Patient profile not found');

    return this.prisma.insuranceClaim.create({
      data: {
        patientId: profile.id, claimId: `CLM-${Date.now()}`,
        policyHolderName: body.policyHolderName, description: body.description,
        policyType: body.policyType, claimAmount: body.claimAmount || 0,
        status: 'pending', submittedDate: new Date(), planId: body.planId,
      },
    });
  }

  async getPlans(query?: string) {
    const where: any = {};
    if (query) where.OR = [{ planName: { contains: query, mode: 'insensitive' } }];

    return this.prisma.insurancePlanListing.findMany({
      where,
      include: { insuranceRep: { include: { user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { planName: 'asc' },
    });
  }

  async getPlansByRep(repUserId: string) {
    const repProfile = await this.prisma.insuranceRepProfile.findUnique({
      where: { userId: repUserId },
      select: { id: true },
    });
    if (!repProfile) return [];
    return this.prisma.insurancePlanListing.findMany({
      where: { insuranceRepId: repProfile.id },
      orderBy: { planName: 'asc' },
    });
  }

  async getDashboard(insuranceRepIdOrUserId: string) {
    // Caller may pass either the InsuranceRepProfile.id or the owning User.id — resolve to profile.id.
    const profile = await this.prisma.insuranceRepProfile.findFirst({
      where: { OR: [{ id: insuranceRepIdOrUserId }, { userId: insuranceRepIdOrUserId }] },
      select: { id: true },
    });
    const insuranceRepId = profile?.id ?? insuranceRepIdOrUserId;
    const where = { insuranceRepId };
    const [total, pending, approved, denied, recentClaims] = await Promise.all([
      this.prisma.insuranceClaim.count({ where }),
      this.prisma.insuranceClaim.count({ where: { ...where, status: 'pending' } }),
      this.prisma.insuranceClaim.count({ where: { ...where, status: 'approved' } }),
      this.prisma.insuranceClaim.count({ where: { ...where, status: 'denied' } }),
      this.prisma.insuranceClaim.findMany({
        where, orderBy: { submittedDate: 'desc' }, take: 10,
        include: { patient: { include: { user: { select: { firstName: true, lastName: true } } } } },
      }),
    ]);
    const totalCoverage = await this.prisma.insuranceClaim.aggregate({
      where: { ...where, status: 'approved' }, _sum: { claimAmount: true },
    }).catch(() => ({ _sum: { claimAmount: 0 } }));

    return { total, pending, approved, denied, totalCoverage: totalCoverage._sum?.claimAmount || 0, recentClaims };
  }

  async updateClaim(id: string, body: { status?: string; notes?: string; approvedAmount?: number }) {
    const claim = await this.prisma.insuranceClaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Claim not found');

    const updateData: any = {};
    if (body.status) updateData.status = body.status;
    if (body.notes) updateData.notes = body.notes;
    if (body.approvedAmount != null) updateData.approvedAmount = body.approvedAmount;
    if (body.status === 'approved') updateData.processedDate = new Date();

    return this.prisma.insuranceClaim.update({ where: { id }, data: updateData });
  }

  async deleteClaim(id: string) {
    const claim = await this.prisma.insuranceClaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Claim not found');
    await this.prisma.insuranceClaim.update({ where: { id }, data: { status: 'cancelled' } });
  }

  async createPlan(userId: string, body: any) {
    const repProfile = await this.prisma.insuranceRepProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!repProfile) throw new NotFoundException('Insurance rep profile not found');

    return this.prisma.insurancePlanListing.create({
      data: {
        insuranceRepId: repProfile.id, planName: body.planName, planType: body.planType || 'Health',
        monthlyPremium: body.monthlyPremium || 0, coverageAmount: body.coverageAmount || 0,
        description: body.description || '', coverageDetails: body.features || body.coverageDetails || [],
      },
    });
  }

  async updatePlan(id: string, body: any) {
    const plan = await this.prisma.insurancePlanListing.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.prisma.insurancePlanListing.update({ where: { id }, data: body });
  }

  async deletePlan(id: string) {
    await this.prisma.insurancePlanListing.update({ where: { id }, data: { isActive: false } });
  }

  // ─── Client Management ──────────────────────────────────────────────────────
  // Links users to an insurance rep via InsuranceClaim with a special "enrollment" status.
  // A dedicated InsuranceClient model could be added later; for now we use claims as the link.
  //
  // Insurance discount on bookings:
  // When checking booking payment (in lib/booking/ or backend booking service), query
  // InsuranceClaim where patientId + status='active' to find active coverage. If found,
  // apply the plan's coverage percentage as a discount. This hook is NOT yet implemented
  // but should be added in the booking cost-check flow.

  async addClient(repUserId: string, clientEmail: string, planId?: string) {
    const repProfile = await this.prisma.insuranceRepProfile.findUnique({
      where: { userId: repUserId },
      select: { id: true },
    });
    if (!repProfile) throw new NotFoundException('Insurance rep profile not found');

    const clientUser = await this.prisma.user.findUnique({
      where: { email: clientEmail },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!clientUser) throw new NotFoundException('No user found with that email');

    const clientPatient = await this.prisma.patientProfile.findUnique({
      where: { userId: clientUser.id },
      select: { id: true },
    });
    if (!clientPatient) throw new BadRequestException('User does not have a patient profile');

    // Check if already linked
    const existing = await this.prisma.insuranceClaim.findFirst({
      where: { insuranceRepId: repProfile.id, patientId: clientPatient.id, status: 'active' },
    });
    if (existing) throw new BadRequestException('Client is already linked to this insurance rep');

    return this.prisma.insuranceClaim.create({
      data: {
        insuranceRepId: repProfile.id,
        patientId: clientPatient.id,
        claimId: `ENR-${Date.now()}`,
        policyHolderName: `${clientUser.firstName} ${clientUser.lastName}`,
        description: 'Insurance enrollment',
        policyType: 'enrollment',
        claimAmount: 0,
        status: 'active',
        submittedDate: new Date(),
        planId: planId || null,
      },
    });
  }

  async getClients(repUserId: string) {
    const repProfile = await this.prisma.insuranceRepProfile.findUnique({
      where: { userId: repUserId },
      select: { id: true },
    });
    if (!repProfile) throw new NotFoundException('Insurance rep profile not found');

    return this.prisma.insuranceClaim.findMany({
      where: { insuranceRepId: repProfile.id, status: 'active' },
      include: {
        patient: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        plan: { select: { id: true, planName: true, planType: true } },
      },
      orderBy: { submittedDate: 'desc' },
    });
  }
}
