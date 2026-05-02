import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import {
  PaymentGateway, TopUpRequest, TopUpResult, PayoutRequest, PayoutResult,
} from './payment-gateway.interface';

/**
 * MCB Juice gateway — placeholder. Wire up once we have the production API
 * credentials from MCB. Until then, this class throws so we can't accidentally
 * route real users through it. Swap the provider binding in `payments.module.ts`
 * from `MockGateway` to this class when ready.
 *
 * Env vars expected when enabled:
 *   MCB_JUICE_API_URL
 *   MCB_JUICE_MERCHANT_ID
 *   MCB_JUICE_API_KEY
 *   MCB_JUICE_WEBHOOK_SECRET   (for verifyTopUp signature)
 */
@Injectable()
export class McbJuiceGateway extends PaymentGateway {
  readonly name = 'mcb_juice';
  private readonly logger = new Logger(McbJuiceGateway.name);

  private ensureConfigured() {
    const url = process.env.MCB_JUICE_API_URL;
    const id = process.env.MCB_JUICE_MERCHANT_ID;
    const key = process.env.MCB_JUICE_API_KEY;
    if (!url || !id || !key) {
      this.logger.error('MCB Juice gateway selected but credentials are missing');
      throw new InternalServerErrorException('MCB Juice not configured — set MCB_JUICE_* env vars');
    }
    return { url, id, key };
  }

  async initiateTopUp(_req: TopUpRequest): Promise<TopUpResult> {
    this.ensureConfigured();
    throw new InternalServerErrorException('MCB Juice top-up not yet implemented — pending production API access');
  }

  async verifyTopUp(_externalId: string): Promise<TopUpResult> {
    this.ensureConfigured();
    throw new InternalServerErrorException('MCB Juice webhook verification not yet implemented');
  }

  async initiatePayout(_req: PayoutRequest): Promise<PayoutResult> {
    this.ensureConfigured();
    throw new InternalServerErrorException('MCB Juice payout not yet implemented');
  }
}
