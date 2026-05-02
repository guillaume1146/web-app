import { Module } from '@nestjs/common';
import { PAYMENT_GATEWAY } from './payment-gateway.interface';
import { MockGateway } from './mock-gateway.service';
import { McbJuiceGateway } from './mcb-juice.gateway';

/**
 * Choose the gateway implementation at boot from env. Default = mock so
 * local/test/staging auto-complete. Flip to `mcb_juice` in production
 * once credentials are configured.
 */
function pickGateway() {
  const choice = process.env.PAYMENT_GATEWAY ?? 'mock';
  switch (choice) {
    case 'mcb_juice': return McbJuiceGateway;
    case 'mock':
    default:          return MockGateway;
  }
}

@Module({
  providers: [
    MockGateway,
    McbJuiceGateway,
    { provide: PAYMENT_GATEWAY, useExisting: pickGateway() },
  ],
  exports: [PAYMENT_GATEWAY],
})
export class PaymentsModule {}
