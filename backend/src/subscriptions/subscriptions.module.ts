import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionRenewalService } from './subscription-renewal.service';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionRenewalService],
  exports: [SubscriptionsService, SubscriptionRenewalService],
})
export class SubscriptionsModule {}
