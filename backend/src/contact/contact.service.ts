import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ContactBody {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Honeypot — if any value is submitted, this is a bot. Field must be `website`. */
  website?: string;
}

/**
 * Contact form intake with:
 *   - Input shape + length validation
 *   - Honeypot (`website` field) to trap bots
 *   - Heuristic spam filter (url density, keyword list, repeated chars)
 *   - In-memory rate limit per email (silent drop, no user-facing error)
 * Delivered to regional admins as an in-app Notification (no email service).
 */
@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  // In-memory rate limiter — resets when the process restarts.
  // For multi-instance deployments, back this with Redis.
  private readonly recent = new Map<string, number[]>();
  private static readonly MAX_PER_HOUR = 5;

  constructor(private prisma: PrismaService) {}

  async submit(body: ContactBody): Promise<{ accepted: boolean; reason?: string }> {
    this.validate(body);

    // Honeypot — pretend to succeed so bots don't retry with variations.
    if (body.website && body.website.trim().length > 0) {
      this.logger.warn(`Honeypot tripped by ${body.email}`);
      return { accepted: true };
    }

    if (this.isSpam(body)) {
      this.logger.warn(`Spam rejected from ${body.email}: "${body.subject}"`);
      return { accepted: true }; // silently drop
    }

    if (!this.underRateLimit(body.email)) {
      return { accepted: true }; // silently drop
    }

    const admins = await this.prisma.user.findMany({
      where: { userType: 'REGIONAL_ADMIN' as any, accountStatus: 'active' },
      select: { id: true },
      take: 10,
    });
    for (const admin of admins) {
      await this.prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'contact',
          title: `Contact: ${body.subject}`.slice(0, 120),
          message: `From ${body.name} (${body.email}): ${body.message}`.slice(0, 1000),
        },
      }).catch(() => { /* one-off failures should not fail the whole request */ });
    }
    return { accepted: true };
  }

  // ─── validation / safety helpers ───────────────────────────────────────

  private validate(body: ContactBody) {
    if (!body?.name || body.name.trim().length < 2 || body.name.length > 120) {
      throw new BadRequestException('Name must be 2–120 characters');
    }
    if (!body?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      throw new BadRequestException('Valid email is required');
    }
    if (!body?.subject || body.subject.trim().length < 3 || body.subject.length > 200) {
      throw new BadRequestException('Subject must be 3–200 characters');
    }
    if (!body?.message || body.message.trim().length < 10 || body.message.length > 5000) {
      throw new BadRequestException('Message must be 10–5000 characters');
    }
  }

  /** Heuristic spam score — returns true if clearly spam. */
  private isSpam(body: ContactBody): boolean {
    const text = `${body.subject}\n${body.message}`.toLowerCase();

    // Excessive URLs
    const urlMatches = text.match(/https?:\/\//g) || [];
    if (urlMatches.length >= 3) return true;

    // Obvious spam keywords
    const keywords = ['viagra', 'cialis', 'casino', 'bitcoin giveaway', 'crypto airdrop', 'nude', 'onlyfans'];
    if (keywords.some(k => text.includes(k))) return true;

    // Repeated-char spam (aaaaaaa…)
    if (/(.)\1{10,}/.test(text)) return true;

    // All uppercase, long — usually spam
    if (body.message.length > 40 && body.message === body.message.toUpperCase()) return true;

    return false;
  }

  private underRateLimit(email: string): boolean {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const history = (this.recent.get(email) || []).filter(t => t > hourAgo);
    if (history.length >= ContactService.MAX_PER_HOUR) {
      this.recent.set(email, history);
      return false;
    }
    history.push(now);
    this.recent.set(email, history);
    return true;
  }
}
