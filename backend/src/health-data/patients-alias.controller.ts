import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthDataService } from './health-data.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Legacy alias routes: /patients/:id/* → delegates to HealthDataService.
 * The frontend still uses the /patients/ prefix in many places; these routes
 * preserve compatibility without duplicating business logic.
 */
@ApiTags('Patients (Alias)')
@Controller('patients/:id')
export class PatientsAliasController {
  constructor(
    private healthDataService: HealthDataService,
    private prisma: PrismaService,
  ) {}

  @Get('appointments')
  async getAppointments(@Param('id') id: string, @Query('limit') limit?: string) {
    try {
      const profile = await this.prisma.patientProfile.findUnique({ where: { userId: id }, select: { id: true } });
      if (!profile) return { success: true, data: [] };
      const appointments = await this.prisma.appointment.findMany({
        where: { patientId: profile.id },
        include: {
          doctor: { include: { user: { select: { id: true, firstName: true, lastName: true, profileImage: true } } } },
        },
        orderBy: { scheduledAt: 'desc' },
        take: parseInt(limit || '50'),
      });
      return { success: true, data: appointments };
    } catch {
      return { success: true, data: [] };
    }
  }

  @Get('prescriptions')
  async getPrescriptions(@Param('id') id: string, @Query('active') active?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const data = await this.healthDataService.getPrescriptions(id, {
      active: active !== undefined ? active === 'true' : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    return { success: true, data };
  }

  @Get('medical-records')
  async getMedicalRecords(@Param('id') id: string, @Query('type') type?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const result = await this.healthDataService.getMedicalRecords(id, {
      type, limit: limit ? parseInt(limit) : undefined, offset: offset ? parseInt(offset) : undefined,
    });
    return { success: true, data: result.records, total: result.total };
  }

  @Get('lab-tests')
  async getLabTests(@Param('id') id: string, @Query('status') status?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const result = await this.healthDataService.getLabTests(id, {
      status, limit: limit ? parseInt(limit) : undefined, offset: offset ? parseInt(offset) : undefined,
    });
    return { success: true, data: result.tests, total: result.total };
  }

  @Get('claims')
  async getClaims(@Param('id') id: string) {
    return { success: true, data: await this.healthDataService.getClaims(id) };
  }

  @Get('pill-reminders')
  async getPillReminders(@Param('id') id: string, @Query('active') active?: string) {
    const data = await this.healthDataService.getPillReminders(id, active !== undefined ? active === 'true' : undefined);
    return { success: true, data };
  }

  @Get('vital-signs')
  async getVitalSigns(@Param('id') id: string, @Query('latest') latest?: string, @Query('limit') limit?: string) {
    const data = await this.healthDataService.getVitalSigns(id, { latest: latest === 'true', limit: limit ? parseInt(limit) : undefined });
    return { success: true, data };
  }

  @Get('bookings')
  async getBookings(@Param('id') id: string, @Query('type') type?: string, @Query('limit') limit?: string) {
    try {
      const profile = await this.prisma.patientProfile.findUnique({ where: { userId: id }, select: { id: true } });
      if (!profile) return { success: true, data: [] };
      const take = parseInt(limit || '50');
      const patientId = profile.id;

      // Fetch all booking types in parallel — merge into unified list
      const [appointments, nurseBookings, childcareBookings, labTests, emergencyBookings, serviceBookings] = await Promise.all([
        this.prisma.appointment.findMany({ where: { patientId }, orderBy: { scheduledAt: 'desc' }, take }).catch(() => []),
        this.prisma.nurseBooking.findMany({ where: { patientId }, orderBy: { scheduledAt: 'desc' }, take }).catch(() => []),
        this.prisma.childcareBooking.findMany({ where: { patientId }, orderBy: { scheduledAt: 'desc' }, take }).catch(() => []),
        this.prisma.labTestBooking.findMany({ where: { patientId }, orderBy: { scheduledAt: 'desc' }, take }).catch(() => []),
        this.prisma.emergencyBooking.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' }, take }).catch(() => []),
        this.prisma.serviceBooking.findMany({ where: { patientId }, orderBy: { scheduledAt: 'desc' }, take }).catch(() => []),
      ]);

      // Each booking gets both `bookingType` (model name) and `type` (route-style name)
      // that the frontend dashboard components filter by (e.g., type === 'nanny').
      // We use JSON round-trip to strip Prisma object magic before overriding `type`.
      const toPlain = (obj: any) => JSON.parse(JSON.stringify(obj));
      const bookings: any[] = [];
      appointments.forEach(a => bookings.push({ ...toPlain(a), bookingType: 'appointment', type: 'doctor' }));
      nurseBookings.forEach(b => bookings.push({ ...toPlain(b), bookingType: 'nurse_booking', type: 'nurse' }));
      childcareBookings.forEach(b => bookings.push({ ...toPlain(b), bookingType: 'childcare_booking', type: 'nanny' }));
      labTests.forEach(b => bookings.push({ ...toPlain(b), bookingType: 'lab_test_booking', type: 'lab-test' }));
      emergencyBookings.forEach(b => bookings.push({ ...toPlain(b), bookingType: 'emergency_booking', type: 'emergency' }));
      serviceBookings.forEach(b => bookings.push({ ...toPlain(b), bookingType: 'service_booking', type: 'service' }));

      // Support filter by route-style type name (e.g., ?type=nanny) OR bookingType
      const filtered = type
        ? bookings.filter(b => b.type === type || b.bookingType?.includes(type))
        : bookings;
      return { success: true, data: filtered };
    } catch {
      return { success: true, data: [] };
    }
  }
}
