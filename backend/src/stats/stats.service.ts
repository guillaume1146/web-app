import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getPlatformStats() {
    const [
      providerCount, patientCount, appointmentCount, regionCount,
      specialtyCount, productCount, roleCount, bookingCount,
      workflowCount, postCount, connectionCount,
    ] = await Promise.all([
      this.prisma.user.count({ where: { userType: { notIn: ['MEMBER' as any, 'REGIONAL_ADMIN' as any, 'CORPORATE_ADMIN' as any, 'INSURANCE_REP' as any, 'REFERRAL_PARTNER' as any] }, accountStatus: 'active' } }),
      this.prisma.user.count({ where: { userType: 'MEMBER' as any } }),
      this.prisma.appointment.count(),
      this.prisma.region.count(),
      this.prisma.providerSpecialty.count({ where: { isActive: true } }),
      this.prisma.providerInventoryItem.count({ where: { isActive: true, inStock: true } }),
      this.prisma.providerRole.count({ where: { isActive: true, isProvider: true } }),
      this.prisma.serviceBooking.count().catch(() => 0),
      this.prisma.workflowTemplate.count().catch(() => 0),
      this.prisma.post.count({ where: { isPublished: true } }).catch(() => 0),
      this.prisma.userConnection.count({ where: { status: 'accepted' } }).catch(() => 0),
    ]);

    const totalConsultations = appointmentCount + bookingCount;

    return [
      { number: providerCount, label: 'Healthcare Providers', color: 'text-blue-500', icon: '🩺' },
      { number: patientCount, label: 'Registered Patients', color: 'text-green-500', icon: '👥' },
      { number: specialtyCount, label: 'Medical Specialties', color: 'text-purple-500', icon: '🏥' },
      { number: productCount, label: 'Health Products', color: 'text-orange-500', icon: '💊' },
      { number: totalConsultations, label: 'Consultations', color: 'text-teal-500', icon: '📋' },
      { number: regionCount, label: 'Regions Covered', color: 'text-cyan-500', icon: '🌍' },
      { number: roleCount, label: 'Provider Types', color: 'text-indigo-500', icon: '👨‍⚕️' },
      { number: workflowCount, label: 'Care Workflows', color: 'text-rose-500', icon: '⚙️' },
      { number: postCount, label: 'Community Posts', color: 'text-amber-500', icon: '📝' },
      { number: connectionCount, label: 'Connections Made', color: 'text-pink-500', icon: '🤝' },
    ];
  }
}
