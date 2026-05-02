import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingsService } from '../bookings/bookings.service';
import { ProvidersService } from '../providers/providers.service';
import { SearchService } from '../search/search.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

/**
 * Legacy Routes Controller — backward-compatible aliases.
 *
 * ALL role-specific routes (/doctors/:id/*, /nurses/:id/*, etc.) redirect
 * to the GENERIC /providers/:id/* and /search/providers?type=X endpoints.
 *
 * No role-specific business logic here — everything delegates to generic services.
 * These aliases exist only for frontend backward compatibility during migration.
 */
@ApiTags('Legacy Routes')
@Controller()
export class LegacyRoutesController {
  constructor(
    private prisma: PrismaService,
    private workflowEngine: WorkflowEngineService,
    private notifications: NotificationsService,
    private bookingsService: BookingsService,
    private providersService: ProvidersService,
    private searchService: SearchService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Available Provider Endpoints — ALL delegate to SearchService
  // ═══════════════════════════════════════════════════════════════════════════

  @Public() @Get('doctors/available')
  async availableDoctors(@Query('q') q?: string) {
    return { success: true, ...(await this.searchService.searchProviders('DOCTOR', q)) };
  }

  @Public() @Get('nurses/available')
  async availableNurses(@Query('q') q?: string) {
    return { success: true, ...(await this.searchService.searchProviders('NURSE', q)) };
  }

  @Public() @Get('nannies/available')
  async availableNannies(@Query('q') q?: string) {
    return { success: true, ...(await this.searchService.searchProviders('NANNY', q)) };
  }

  @Public() @Get('lab-techs/available')
  async availableLabTechs(@Query('q') q?: string) {
    return { success: true, ...(await this.searchService.searchProviders('LAB_TECHNICIAN', q)) };
  }

  @Public() @Get('responders/available')
  async availableResponders(@Query('q') q?: string) {
    return { success: true, ...(await this.searchService.searchProviders('EMERGENCY_WORKER', q)) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Booking Endpoints — ALL delegate to BookingsService.createBooking()
  // Body must include providerUserId (or legacy aliases: doctorId, nurseId, etc.)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normalize booking type — ALL new bookings use 'service_booking'.
   * Legacy types only kept for reading old data, not for new bookings.
   * No hardcoded role names — everything is 'service_booking'.
   */
  private normalizeBookingType(type: string): string {
    // If it's already the full type name, return as-is
    if (type === 'service_booking') return type;
    // Legacy full names (for old data reads)
    if (['appointment', 'nurse_booking', 'childcare_booking', 'lab_test_booking', 'emergency_booking'].includes(type)) return type;
    // Everything else → service_booking (the universal model)
    return 'service_booking';
  }

  private async delegateBooking(body: any, patientUserId: string, providerType: string) {
    const providerUserId = body.providerUserId || body.doctorId || body.nurseId || body.nannyId || body.labTechId || body.responderId;
    if (!providerUserId) return { success: false, message: 'providerUserId is required' };

    const result = await this.bookingsService.createBooking(patientUserId, {
      providerUserId, providerType,
      scheduledDate: body.scheduledDate || body.date || body.startDate,
      scheduledTime: body.scheduledTime || body.time || body.startTime || '09:00',
      type: body.type || body.serviceType,
      reason: body.reason, notes: body.notes, duration: body.duration,
      serviceName: body.serviceName, servicePrice: body.servicePrice,
      consultationType: body.consultationType, children: body.children,
      sampleType: body.sampleType, priority: body.priority, testName: body.testName,
      location: body.location, contactNumber: body.contactNumber, specialty: body.specialty,
    });

    return {
      success: true,
      booking: {
        id: result.booking.id,
        type: providerType,
        scheduledAt: result.booking.scheduledAt,
        status: 'pending',
        ticketId: 'BK-' + result.booking.id.slice(0, 8).toUpperCase(),
      },
      workflowInstanceId: result.workflowInstanceId,
    };
  }

  @Post('bookings/doctor')
  async bookDoctor(@Body() body: any, @CurrentUser() user: JwtPayload) {
    return this.delegateBooking(body, user.sub, 'DOCTOR');
  }

  @Post('bookings/nurse')
  async bookNurse(@Body() body: any, @CurrentUser() user: JwtPayload) {
    return this.delegateBooking(body, user.sub, 'NURSE');
  }

  @Post('bookings/nanny')
  async bookNanny(@Body() body: any, @CurrentUser() user: JwtPayload) {
    return this.delegateBooking(body, user.sub, 'NANNY');
  }

  @Post('bookings/lab-test')
  async bookLabTest(@Body() body: any, @CurrentUser() user: JwtPayload) {
    return this.delegateBooking(body, user.sub, 'LAB_TECHNICIAN');
  }

  @Post('bookings/emergency')
  async bookEmergency(@Body() body: any, @CurrentUser() user: JwtPayload) {
    return this.delegateBooking(body, user.sub, 'EMERGENCY_WORKER');
  }

  @Post('bookings/service')
  async bookService(@Body() body: any, @CurrentUser() user: JwtPayload) {
    return this.delegateBooking(body, user.sub, body.providerType || 'CAREGIVER');
  }

  @Get('bookings/service')
  async listServiceBookings(@CurrentUser() user: JwtPayload) {
    const patientProfile = await this.prisma.patientProfile.findUnique({ where: { userId: user.sub }, select: { id: true } });
    const bookings = await this.prisma.serviceBooking.findMany({
      where: { OR: [...(patientProfile ? [{ patientId: patientProfile.id }] : []), { providerUserId: user.sub }] },
      orderBy: { createdAt: 'desc' }, take: 50,
    });
    return { success: true, data: bookings };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Booking Action — generic for ALL booking types
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('bookings/action')
  async bookingAction(@Body() body: { bookingId: string; bookingType: string; action: string; notes?: string }, @CurrentUser() user: JwtPayload) {
    const { bookingId, bookingType, action, notes } = body;
    if (!bookingId || !action) return { success: false, message: 'bookingId and action are required' };

    // Normalize booking type: frontend sends 'service' but workflow engine needs 'service_booking'
    const normalizedType = this.normalizeBookingType(bookingType);

    try {
      await this.workflowEngine.transition({
        bookingId, bookingType: normalizedType,
        action, actionByUserId: user.sub, actionByRole: 'provider', notes,
      });
    } catch {
      // Direct status update fallback — update BOTH the booking AND the workflow instance
      const statusMap: Record<string, string> = { accept: 'confirmed', deny: 'cancelled', decline: 'cancelled', cancel: 'cancelled', complete: 'completed' };
      const newStatus = statusMap[action] || action;

      // Update ServiceBooking
      try {
        await this.prisma.serviceBooking.update({ where: { id: bookingId }, data: { status: newStatus } });
      } catch {
        const modelMap: Record<string, string> = { appointment: 'appointment', nurse_booking: 'nurseBooking', childcare_booking: 'childcareBooking', lab_test_booking: 'labTestBooking', emergency_booking: 'emergencyBooking' };
        const modelName = modelMap[bookingType];
        if (modelName) await (this.prisma as any)[modelName]?.update?.({ where: { id: bookingId }, data: { status: newStatus } }).catch(() => {});
      }

      // Also update the WorkflowInstance so the unified provider list reflects the change
      await this.prisma.workflowInstance.updateMany({
        where: { bookingId },
        data: {
          currentStatus: newStatus,
          ...(newStatus === 'completed' ? { completedAt: new Date() } : {}),
          ...(newStatus === 'cancelled' ? { cancelledAt: new Date() } : {}),
        },
      }).catch(() => {});
    }

    // Video room creation, payment, conversation, refund, and review request
    // are now handled automatically by the WorkflowEngine's 3-tier trigger system.
    // No duplicate logic needed here.

    const messageMap: Record<string, string> = { accept: 'Booking confirmed successfully', deny: 'Booking declined', decline: 'Booking declined', cancel: 'Booking cancelled', complete: 'Booking completed' };
    return { success: true, message: messageMap[action] || `Action '${action}' completed` };
  }

  // NOTE: All provider-specific aliases (/doctors/:id/*, /nurses/:id/*, etc.)
  // have been removed. Use /providers/:id/* generic endpoints instead.
}
