import { Module } from '@nestjs/common';
import { ReferralTrackingController } from './referral-tracking.controller';
import { ReferralPartnersController } from './referral-partners.controller';
import { ReferralTrackingService } from './referral-tracking.service';

@Module({ controllers: [ReferralTrackingController, ReferralPartnersController], providers: [ReferralTrackingService] })
export class ReferralTrackingModule {}
