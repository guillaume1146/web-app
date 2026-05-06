import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('Providers')
@Controller('providers/:id')
export class ProvidersController {
  constructor(private providersService: ProvidersService) {}

  @Public()
  @Get()
  async getProfile(@Param('id') id: string) {
    return { success: true, data: await this.providersService.getProfile(id) };
  }

  @Public()
  @Get('services')
  async getServices(@Param('id') id: string) {
    return { success: true, data: await this.providersService.getServices(id) };
  }

  // Legacy alias — older pages (lab results) fetch /providers/:id/tests
  // expecting the same shape as /services.
  @Public()
  @Get('tests')
  async getTests(@Param('id') id: string) {
    return { success: true, data: await this.providersService.getServices(id) };
  }

  @Public()
  @Get('reviews')
  async getReviews(@Param('id') id: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const data = await this.providersService.getReviews(id, { limit: limit ? parseInt(limit) : undefined, offset: offset ? parseInt(offset) : undefined });
    return { success: true, data: data.reviews, total: data.total, averageRating: data.averageRating, ratingDistribution: data.ratingDistribution };
  }

  @Post('reviews')
  async createReview(@Param('id') id: string, @Body() body: { rating: number; comment?: string }, @CurrentUser() user: JwtPayload) {
    const data = await this.providersService.createReview(id, user.sub, body);
    return { success: true, data };
  }

  @Get('booking-requests')
  async getBookingRequests(@Param('id') id: string) {
    return { success: true, data: await this.providersService.getBookingRequests(id) };
  }

  @Public()
  @Get('schedule')
  async getSchedule(@Param('id') id: string) {
    return { success: true, data: await this.providersService.getSchedule(id) };
  }

  @Get('statistics')
  async getStatistics(@Param('id') id: string) {
    return { success: true, data: await this.providersService.getStatistics(id) };
  }

  @Get('patients')
  async getPatients(@Param('id') id: string) {
    return { success: true, data: await this.providersService.getPatients(id) };
  }

  @Get('appointments')
  async getAppointments(@Param('id') id: string, @Query('limit') limit?: string) {
    return { success: true, data: await this.providersService.getAppointments(id, limit ? parseInt(limit) : 50) };
  }

  // ── GET /providers/:id/workplaces — public list of healthcare entities ──
  @Public()
  @Get('workplaces')
  async getWorkplaces(@Param('id') id: string) {
    return { success: true, data: await this.providersService.getWorkplaces(id) };
  }

  // ── POST /providers/:id/workplaces — join a healthcare entity ───────────
  @Post('workplaces')
  async addWorkplace(
    @Param('id') id: string,
    @Body() body: { healthcareEntityId: string; role?: string; isPrimary?: boolean },
    @CurrentUser() user: JwtPayload,
  ) {
    // Only the provider themselves can edit their workplaces
    if (user.sub !== id) return { success: false, message: 'Forbidden' };
    return { success: true, data: await this.providersService.addWorkplace(id, body) };
  }
}
