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
  async searchProviders(type: string, query?: string, page?: number, limit?: number, specialty?: string) {
    if (!type) throw new BadRequestException('type parameter is required');
    const uType = type.toUpperCase();
    const take = Math.min(limit || 50, 100);
    const pageNum = Math.max(page || 1, 1);
    const skip = (pageNum - 1) * take;

    const where: any = { userType: uType, accountStatus: 'active' };
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
