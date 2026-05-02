import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Single source of truth for role identifier conversions.
 *
 * Replaces the hardcoded cookieToPrismaUserType / prismaUserTypeToCookie /
 * signupTypeToPrisma maps. All lookups now resolve against the `ProviderRole`
 * table (DB-driven) so a Regional Admin can create new roles at runtime
 * without code changes.
 *
 * Uses an in-memory cache refreshed every {@link CACHE_TTL_MS} to keep the
 * hot login path fast.
 */
@Injectable()
export class RolesResolverService implements OnModuleInit {
  private readonly logger = new Logger(RolesResolverService.name);
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /** code (UPPER_CASE) → cookieValue (slug) */
  private codeToCookie: Map<string, string> = new Map();
  /** cookieValue (slug) → code (UPPER_CASE) */
  private cookieToCode: Map<string, string> = new Map();
  /** signup-form slug variants → code; superset of cookieToCode + alternate spellings */
  private signupSlugToCode: Map<string, string> = new Map();

  private lastRefresh = 0;
  private refreshInFlight: Promise<void> | null = null;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.refresh().catch(err => {
      this.logger.warn(`Initial roles refresh failed (will retry on demand): ${err}`);
    });
  }

  /** Force a reload from the DB (called on TTL miss or after admin CRUD). */
  async refresh(): Promise<void> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this._doRefresh();
    try {
      await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  private async _doRefresh(): Promise<void> {
    const roles = await this.prisma.providerRole.findMany({
      select: { code: true, cookieValue: true, slug: true, isActive: true },
    });

    const codeToCookie = new Map<string, string>();
    const cookieToCode = new Map<string, string>();
    const signupSlugToCode = new Map<string, string>();

    for (const r of roles) {
      const code = r.code.toUpperCase();
      if (r.cookieValue) {
        codeToCookie.set(code, r.cookieValue);
        cookieToCode.set(r.cookieValue, code);
        cookieToCode.set(r.cookieValue.toLowerCase(), code);
      }
      if (r.slug) {
        signupSlugToCode.set(r.slug, code);
        signupSlugToCode.set(r.slug.toLowerCase(), code);
      }
      // Always allow the canonical code as input too
      signupSlugToCode.set(code, code);
      signupSlugToCode.set(code.toLowerCase(), code);
    }

    // Hardcoded back-compat aliases that pre-date the slug column.
    // Kept narrow — only legacy synonyms that the signup form might still send.
    const legacyAliases: Record<string, string> = {
      nanny: 'NANNY',
      pharmacist: 'PHARMACIST',
      lab: 'LAB_TECHNICIAN',
      emergency: 'EMERGENCY_WORKER',
      ambulance: 'EMERGENCY_WORKER',
      responder: 'EMERGENCY_WORKER',
      'lab-technician': 'LAB_TECHNICIAN',
      'child-care-nurse': 'NANNY',
      pharmacy: 'PHARMACIST',
    };
    for (const [k, v] of Object.entries(legacyAliases)) {
      if (!signupSlugToCode.has(k)) signupSlugToCode.set(k, v);
      if (!cookieToCode.has(k)) cookieToCode.set(k, v);
    }

    this.codeToCookie = codeToCookie;
    this.cookieToCode = cookieToCode;
    this.signupSlugToCode = signupSlugToCode;
    this.lastRefresh = Date.now();
    this.logger.log(`Loaded ${roles.length} provider roles into resolver cache`);
  }

  private async ensureFresh() {
    if (Date.now() - this.lastRefresh > RolesResolverService.CACHE_TTL_MS) {
      await this.refresh().catch(() => { /* swallow — keep stale cache */ });
    }
  }

  /** Cookie value (e.g. 'doctor', 'child-care-nurse') → Prisma enum code. */
  async cookieToCodeAsync(cookieValue: string): Promise<string | null> {
    await this.ensureFresh();
    if (!cookieValue) return null;
    return (
      this.cookieToCode.get(cookieValue) ??
      this.cookieToCode.get(cookieValue.toLowerCase()) ??
      null
    );
  }

  /** Prisma enum code (e.g. 'DOCTOR') → cookie value. */
  async codeToCookieAsync(code: string): Promise<string | null> {
    await this.ensureFresh();
    if (!code) return null;
    return this.codeToCookie.get(code.toUpperCase()) ?? null;
  }

  /** Signup form value (slug, code, alias) → Prisma enum code. */
  async signupToCodeAsync(signupValue: string): Promise<string | null> {
    await this.ensureFresh();
    if (!signupValue) return null;
    return (
      this.signupSlugToCode.get(signupValue) ??
      this.signupSlugToCode.get(signupValue.toLowerCase()) ??
      this.signupSlugToCode.get(signupValue.toUpperCase()) ??
      null
    );
  }

  /** Sync helpers — return cached value or null. Use for non-async paths. */
  cookieToCodeSync(cookieValue: string): string | null {
    if (!cookieValue) return null;
    return (
      this.cookieToCode.get(cookieValue) ??
      this.cookieToCode.get(cookieValue.toLowerCase()) ??
      null
    );
  }

  codeToCookieSync(code: string): string | null {
    if (!code) return null;
    return this.codeToCookie.get(code.toUpperCase()) ?? null;
  }
}
