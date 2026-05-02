import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Formats an Account-Balance amount with the right currency code for the
 * user / region. Backend notifications previously hardcoded "MUR" — fine
 * for Mauritius, wrong for Madagascar (MGA), Kenya (KES), Rwanda (RWF),
 * Togo/Benin (XOF). This helper reads the user's wallet (authoritative)
 * and falls back to the region or `MUR`.
 *
 * Output: "500 MUR", "2500 MGA", etc. Integer amounts (no decimals) —
 * Health Credit is 1:1 with the region's smallest unit of currency.
 *
 * Frontend rendering uses `useCurrency()` + `Intl.NumberFormat`; this
 * server-side helper exists for notifications that get SENT as plain
 * strings and need to be readable when pushed to Socket.IO / email / SMS.
 */
@Injectable()
export class MoneyFormatService {
  constructor(private prisma: PrismaService) {}

  /** Synchronous when the caller already has the currency. */
  format(amount: number, currency = 'MUR'): string {
    return `${amount.toFixed(0)} ${currency}`;
  }

  /** Looks up the user's wallet currency, then formats. */
  async formatForUser(amount: number, userId: string): Promise<string> {
    const wallet = await this.prisma.userWallet.findUnique({
      where: { userId }, select: { currency: true },
    });
    return this.format(amount, wallet?.currency ?? 'MUR');
  }

  /** Fetch-only: currency for a user (for callers that need it multiple times). */
  async currencyFor(userId: string): Promise<string> {
    const wallet = await this.prisma.userWallet.findUnique({
      where: { userId }, select: { currency: true },
    });
    return wallet?.currency ?? 'MUR';
  }
}
