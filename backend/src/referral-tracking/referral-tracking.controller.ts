import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReferralTrackingService } from './referral-tracking.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Referral Tracking')
@Controller('referral-tracking')
@Public()
export class ReferralTrackingController {
  constructor(private referralTrackingService: ReferralTrackingService) {}

  @Post()
  async track(@Body() body: { referralCode: string; source?: string; medium?: string }) {
    try {
      const result = await this.referralTrackingService.track(body);
      if ('error' in result) return { success: false, message: result.error };
      return { success: true, data: result.data };
    } catch { return { success: false, message: 'Failed to track referral' }; }
  }
}
