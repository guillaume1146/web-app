import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  /** GET /api/subscriptions — list plans */
  async findPlans(opts: { type?: string; countryCode?: string }) {
    // Match the original Next.js behavior: combine conditions with AND,
    // and when countryCode is given, include both the country-specific plans
    // AND any global plans (countryCode: null).
    const conditions: any[] = [{ isActive: true }];
    if (opts.type === 'individual' || opts.type === 'corporate') {
      conditions.push({ type: opts.type });
    }
    if (opts.countryCode) {
      conditions.push({ OR: [{ countryCode: opts.countryCode }, { countryCode: null }] });
    }
    const where = conditions.length === 1 ? conditions[0] : { AND: conditions };

    return this.prisma.subscriptionPlan.findMany({
      where,
      include: { planServices: { include: { platformService: true } } },
      orderBy: { price: 'asc' },
    });
  }

  /** GET /api/subscriptions/:id — single plan */
  async findPlanById(id: string) {
    // Try by ID first, then by slug
    let plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: { planServices: { include: { platformService: true } } },
    });

    if (!plan) {
      plan = await this.prisma.subscriptionPlan.findFirst({
        where: { slug: id },
        include: { planServices: { include: { platformService: true } } },
      });
    }

    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  /** GET /api/regions — list regions with currency data */
  async findRegions() {
    return this.prisma.region.findMany({
      select: { id: true, name: true, countryCode: true, currency: true, currencySymbol: true, language: true, trialCredit: true },
      orderBy: { name: 'asc' },
    });
  }

  /** GET /api/regions/:id */
  async findRegionById(id: string) {
    const region = await this.prisma.region.findUnique({
      where: { id },
      select: { id: true, name: true, countryCode: true, currency: true, currencySymbol: true, language: true, trialCredit: true },
    });
    if (!region) throw new NotFoundException('Region not found');
    return region;
  }
}
