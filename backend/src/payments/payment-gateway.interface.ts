/**
 * Payment Gateway abstraction — the seam for every external money boundary.
 *
 * Today (April 2026) every flow runs on the internal Account Balance ledger:
 * wallet top-ups are simulated, provider cash-outs don't exist. When we
 * later wire MCB Juice (primary) or card processing (fallback), we swap
 * the `MockGateway` for `McbJuiceGateway` without touching any ledger code.
 *
 * Golden rule — external call state transitions must match ledger state:
 *
 *   pending  ──(callback: succeeded)──▶  completed  ──▶ credit wallet
 *            ──(callback: failed)   ──▶  failed     ──▶ no ledger write
 *            ──(timeout 1h)         ──▶  expired    ──▶ no ledger write
 *
 * Never credit the wallet before the gateway confirms success. Never mark
 * a gateway transaction `completed` without a corresponding ledger row.
 */

export interface TopUpRequest {
  userId: string;
  amount: number;
  currency: string;
  channel: 'mcb_juice' | 'card' | 'mock';
  /** Optional channel-specific metadata: MSISDN for mobile, cardToken for card. */
  channelRef?: string;
}

export interface TopUpResult {
  /** Gateway-specific transaction id. Persist as `externalTransactionId` so
   *  reconciliation + webhook matching works. */
  externalId: string;
  status: 'pending' | 'completed' | 'failed';
  /** Gateway-generated URL the user visits to complete payment (MCB Juice
   *  redirect, 3DS challenge, etc.). Null when synchronously completed. */
  redirectUrl: string | null;
  failureReason?: string;
}

export interface PayoutRequest {
  /** MediWyz user receiving real money (provider or insurance-company-owner). */
  userId: string;
  amount: number;
  currency: string;
  channel: 'mcb_juice' | 'bank_transfer';
  /** MSISDN or bank account — collected from the user's payout settings. */
  payoutRef: string;
  description: string;
}

export interface PayoutResult {
  externalId: string;
  status: 'pending' | 'completed' | 'failed';
  failureReason?: string;
}

/**
 * Every gateway implements this. `MockGateway` (current default) auto-succeeds
 * so dev/testing works end-to-end. `McbJuiceGateway` (future) will call the
 * real HTTP API.
 */
export abstract class PaymentGateway {
  abstract readonly name: string;

  /** Kick off a top-up. Returns an external id the caller persists immediately. */
  abstract initiateTopUp(req: TopUpRequest): Promise<TopUpResult>;

  /** Verify a gateway callback / webhook — checks signature + returns the final state. */
  abstract verifyTopUp(externalId: string, signaturePayload?: unknown): Promise<TopUpResult>;

  /** Send real money OUT to a user's external account. */
  abstract initiatePayout(req: PayoutRequest): Promise<PayoutResult>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
