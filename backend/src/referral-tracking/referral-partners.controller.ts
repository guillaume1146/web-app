import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReferralTrackingService } from './referral-tracking.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('Referral Tracking')
@Controller('referral-partners')
export class ReferralPartnersController {
  constructor(private referralTrackingService: ReferralTrackingService) {}

  /** GET /api/referral-partners/me — current user's referral dashboard.
   *  Auto-provisions a code on first hit so every user has one. */
  @Get('me')
  async getMyDashboard(@CurrentUser() user: JwtPayload) {
    try {
      const data = await this.referralTrackingService.getDashboard(user.sub);
      return { success: true, data };
    } catch (error) {
      console.error('GET /referral-partners/me error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /** GET /api/referral-partners/:id/dashboard — referral partner dashboard
   *  (legacy URL kept for REFERRAL_PARTNER seeded users). */
  @Get(':id/dashboard')
  async getDashboard(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    try {
      const data = await this.referralTrackingService.getDashboard(id);
      return { success: true, data };
    } catch (error) {
      console.error('GET /referral-partners/:id/dashboard error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }
}
