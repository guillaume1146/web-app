import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentGateway, TopUpRequest, TopUpResult, PayoutRequest, PayoutResult,
} from './payment-gateway.interface';

/**
 * Dev / test gateway — auto-completes every top-up and payout. Used until
 * MCB Juice integration is certified. The shape of the return values is
 * identical to a real gateway so swapping the binding in `payments.module.ts`
 * is the ONLY code change needed to flip the switch.
 *
 * Toggle via env `PAYMENT_GATEWAY=mock|mcb_juice`. Defaults to mock.
 */
@Injectable()
export class MockGateway extends PaymentGateway {
  readonly name = 'mock';
  private readonly logger = new Logger(MockGateway.name);

  async initiateTopUp(req: TopUpRequest): Promise<TopUpResult> {
    this.logger.log(`[mock] top-up ${req.amount} ${req.currency} via ${req.channel} for ${req.userId}`);
    return {
      externalId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'completed',
      redirectUrl: null,
    };
  }

  async verifyTopUp(externalId: string): Promise<TopUpResult> {
    return { externalId, status: 'completed', redirectUrl: null };
  }

  async initiatePayout(req: PayoutRequest): Promise<PayoutResult> {
    this.logger.log(`[mock] payout ${req.amount} ${req.currency} to ${req.userId} via ${req.channel}`);
    return {
      externalId: `mock_payout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'completed',
    };
  }
}
