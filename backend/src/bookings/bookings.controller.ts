import { Controller, Get, Post, Param, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  /** POST /api/bookings — unified booking creation (any provider type) */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBookingDto, @CurrentUser() user: JwtPayload) {
    // Fold legacy role-specific IDs into canonical providerUserId so callers
    // using doctorId/nurseId/nannyId/labTechId/emergencyWorkerId still work.
    dto.providerUserId =
      dto.providerUserId || dto.doctorId || dto.nurseId || dto.nannyId ||
      dto.labTechId || dto.emergencyWorkerId || '';
    if (!dto.providerUserId) {
      return { success: false, message: 'providerUserId is required' };
    }
    // Alias price → servicePrice for callers still using the old field name.
    if (!dto.servicePrice && dto.price) {
      dto.servicePrice = dto.price;
    }
    // Alias scheduledAt (ISO timestamp) → scheduledDate + scheduledTime.
    if (dto.scheduledAt && (!dto.scheduledDate || !dto.scheduledTime)) {
      const d = new Date(dto.scheduledAt);
      if (!isNaN(d.getTime())) {
        dto.scheduledDate = dto.scheduledDate || d.toISOString().slice(0, 10);
        dto.scheduledTime = dto.scheduledTime || d.toISOString().slice(11, 16);
      }
    }
    const result = await this.bookingsService.createBooking(user.sub, dto as CreateBookingDto & { providerUserId: string });
    // Return in format frontend expects: { success, booking: { id, type, ticketId, ... } }
    return {
      success: true,
      booking: {
        id: result.booking?.id || '',
        type: dto.providerType || dto.type || 'consultation',
        scheduledAt: result.booking?.scheduledAt || result.booking?.createdAt || new Date().toISOString(),
        status: 'pending',
        ticketId: result.booking?.id ? 'BK-' + result.booking.id.slice(0, 8).toUpperCase() : 'BK-UNKNOWN',
      },
      workflowInstanceId: result.workflowInstanceId || null,
    } as const;
  }

  /** GET /api/bookings/unified — all bookings across all types */
  @Get('unified')
  async getUnified(@CurrentUser() user: JwtPayload, @Query('role') role?: string) {
    const r = (role === 'provider' ? 'provider' : 'patient') as 'patient' | 'provider';
    const data = await this.bookingsService.getUnified(user.sub, r);
    return { success: true, data };
  }

  /** POST /api/bookings/cancel */
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Body() dto: CancelBookingDto, @CurrentUser() user: JwtPayload) {
    const data = await this.bookingsService.cancel(user.sub, dto.bookingId, dto.bookingType);
    return { success: true, data };
  }

  /** POST /api/bookings/reschedule */
  @Post('reschedule')
  @HttpCode(HttpStatus.OK)
  async reschedule(@Body() dto: RescheduleBookingDto, @CurrentUser() user: JwtPayload) {
    const data = await this.bookingsService.reschedule(user.sub, dto.bookingId, dto.bookingType, dto.newDate, dto.newTime);
    return { success: true, data };
  }

  /** GET /api/bookings/available-slots */
  @Public()
  @Get('available-slots')
  async availableSlots(
    @Query('providerUserId') providerUserId: string,
    @Query('providerId') providerIdAlias: string,
    @Query('date') date: string,
    @Query('duration') durationStr: string,
  ) {
    // Accept legacy ?providerId= alias.
    const resolved = providerUserId || providerIdAlias;
    const slots = await this.bookingsService.getAvailableSlots(resolved, date, parseInt(durationStr) || 30);
    return { success: true, slots };
  }
}
