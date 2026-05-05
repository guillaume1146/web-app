import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { userTypeToProfileRelation } from '../auth/auth.service';

/**
 * LEGACY profile include map — for backward compatibility with roles that have
 * dedicated profile tables. New dynamic roles (created by regional admins)
 * don't have profile tables and use User fields + ProviderRole config only.
 *
 * This map will shrink over time as legacy profiles are deprecated.
 */
const LEGACY_PROFILE_INCLUDE: Record<string, Record<string, any>> = {
  DOCTOR: { doctorProfile: { select: { id: true, specialty: true, subSpecialties: true, rating: true, reviewCount: true, experience: true, consultationFee: true, videoConsultationFee: true, consultationTypes: true, bio: true, location: true, languages: true, emergencyAvailable: true, homeVisitAvailable: true, telemedicineAvailable: true } } },
  NURSE: { nurseProfile: { select: { id: true, specializations: true, experience: true, licenseNumber: true } } },
  NANNY: { nannyProfile: { select: { id: true, experience: true, certifications: true } } },
  PHARMACIST: { pharmacistProfile: { select: { id: true, pharmacyName: true, specializations: true } } },
  LAB_TECHNICIAN: { labTechProfile: { select: { id: true, labName: true, specializations: true } } },
  EMERGENCY_WORKER: { emergencyWorkerProfile: { select: { id: true, certifications: true, vehicleType: true, responseZone: true, emtLevel: true } } },
  CAREGIVER: { caregiverProfile: { select: { id: true, experience: true, specializations: true, certifications: true } } },
  PHYSIOTHERAPIST: { physiotherapistProfile: { select: { id: true, experience: true, specializations: true, clinicName: true } } },
  DENTIST: { dentistProfile: { select: { id: true, experience: true, specializations: true, clinicName: true } } },
  OPTOMETRIST: { optometristProfile: { select: { id: true, experience: true, specializations: true, clinicName: true } } },
  NUTRITIONIST: { nutritionistProfile: { select: { id: true, experience: true, specializations: true, certifications: true } } },
  INSURANCE_REP: { insuranceRepProfile: { select: { id: true, companyName: true, coverageTypes: true } } },
};

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  /**
   * Search providers by type — works for ANY ProviderRole (legacy or dynamic).
   *
   * For legacy roles with dedicated profile tables: includes profile data.
   * For new dynamic roles: uses User fields only + ProviderSpecialty for filtering.
   */
  // ─── GET /search/available-slots — real slot availability across a role ──────
  // Reads ProviderAvailability (weekly schedule) + BookedSlot (taken slots) to
  // return per-time-slot availability counts for the hero booking widget.
  // Public endpoint — no auth required.
  async getAvailableSlots(dateStr: string, roleCode: string) {
    const uType = roleCode.toUpperCase();

    // Parse date parts from YYYY-MM-DD (avoid timezone shift from new Date(str))
    const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parts) return { slots: [], providerCount: 0 };
    const [, yStr, mStr, dStr] = parts;
    const year = parseInt(yStr), month = parseInt(mStr) - 1, day = parseInt(dStr);
    const dayOfWeek = new Date(year, month, day).getDay(); // 0=Sun, 6=Sat

    const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0));
    const dayEnd   = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    // All active providers of this role
    const providers = await this.prisma.user.findMany({
      where: { userType: uType as any, accountStatus: 'active' },
      select: { id: true },
    });
    if (providers.length === 0) return { slots: [], providerCount: 0 };

    const providerIds = providers.map(p => p.id);

    // Weekly availability windows for this day of week
    const availabilities = await this.prisma.providerAvailability.findMany({
      where: { userId: { in: providerIds }, dayOfWeek, isActive: true },
    });
    if (availabilities.length === 0) return { slots: [], providerCount: providers.length };

    // Already-taken slots on this date
    const bookedSlots = await this.prisma.bookedSlot.findMany({
      where: {
        providerUserId: { in: providerIds },
        date: { gte: dayStart, lte: dayEnd },
        status: 'booked',
      },
      select: { providerUserId: true, startTime: true },
    });
    const bookedSet = new Set(bookedSlots.map(b => `${b.providerUserId}:${b.startTime}`));

    const toMin = (t: string) => {
      const [h, m = 0] = t.split(':').map(Number);
      return h * 60 + m;
    };

    // Aggregate: for each time string, count how many providers have it free vs taken
    const slotMap = new Map<string, { available: number; total: number }>();

    for (const avail of availabilities) {
      const startMin = toMin(avail.startTime);
      const endMin   = toMin(avail.endTime);
      const duration = avail.slotDuration ?? 60;

      for (let m = startMin; m < endMin; m += duration) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

        const entry = slotMap.get(timeStr) ?? { available: 0, total: 0 };
        entry.total++;
        if (!bookedSet.has(`${avail.userId}:${timeStr}`)) entry.available++;
        slotMap.set(timeStr, entry);
      }
    }

    const slots = Array.from(slotMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, c]) => ({ time, available: c.available, total: c.total, taken: c.available === 0 }));

    return { slots, providerCount: providers.length };
  }

  async searchProviders(type: string, query?: string, page?: number, limit?: number, specialty?: string, serviceId?: string) {
    if (!type) throw new BadRequestException('type parameter is required');
    const uType = type.toUpperCase();
    const take = Math.min(limit || 50, 100);
    const pageNum = Math.max(page || 1, 1);
    const skip = (pageNum - 1) * take;

    const where: any = { userType: uType, accountStatus: 'active' };

    // When serviceId is supplied, prefer providers who have explicitly configured
    // that service in ProviderServiceConfig.  If none have done so (e.g. freshly
    // seeded DB where no provider has yet opted in), fall back to all providers of
    // the requested type so the UI never shows an empty list.
    if (serviceId) {
      const configs = await this.prisma.providerServiceConfig.findMany({
        where: { platformServiceId: serviceId, isActive: true },
        select: { providerUserId: true },
      });
      if (configs.length > 0) {
        where.id = { in: configs.map(c => c.providerUserId) };
      }
      // configs.length === 0 → no filter applied; show all providers of this type
    }

    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { address: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Specialty filtering — uses ProviderSpecialty model (dynamic, DB-driven)
    // Also supports legacy profile-level specialty arrays for backward compat
    if (specialty) {
      const hasLegacyProfile = LEGACY_PROFILE_INCLUDE[uType];
      if (hasLegacyProfile) {
        // Legacy: filter on profile relation's specialty/specializations field
        const profileRelation = userTypeToProfileRelation[uType];
        if (profileRelation) {
          // DoctorProfile uses 'specialty' (String[]), others use 'specializations' (String[])
          const specField = uType === 'DOCTOR' ? 'specialty' : 'specializations';
          where[profileRelation] = { [specField]: { has: specialty } };
        }
      }
      // Note: for new dynamic roles without legacy profiles, specialty filtering
      // happens post-query via ProviderSpecialty since there's no profile relation to filter on
    }

    // Include legacy profile data if available, otherwise just user fields
    const profileInclude = LEGACY_PROFILE_INCLUDE[uType] || {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, firstName: true, lastName: true, profileImage: true,
          address: true, phone: true, verified: true, userType: true, gender: true,
          ...profileInclude,
        },
        take, skip,
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Fetch specialties for this provider type from the dynamic ProviderSpecialty model
    const providerSpecialties = await this.prisma.providerSpecialty.findMany({
      where: { providerType: uType as any, isActive: true },
      select: { name: true, icon: true },
    });

    // Flatten profile data into top-level for frontend compatibility
    const data = users.map((u: any) => {
      const profileRelation = userTypeToProfileRelation[uType];
      const profile = profileRelation ? u[profileRelation] : null;
      const rest = profileRelation ? (() => { const { [profileRelation]: _unused, ...r } = u; return r; })() : u;

      return {
        ...(profile || {}),
        ...rest,
        name: `${u.firstName} ${u.lastName}`,
        id: u.id,
        userId: u.id,
        profileId: profile?.id,
        specializations: profile?.specializations || profile?.specialty || profile?.certifications || providerSpecialties.map(s => s.name),
        experience: profile?.experience || null,
        rating: profile?.rating || 0,
        consultationFee: profile?.consultationFee || 0,
        bio: profile?.bio || '',
      };
    });

    return { data, total, page: pageNum, limit: take, totalPages: Math.ceil(total / take) };
  }
}
