import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(
    private searchService: SearchService,
    private prisma: PrismaService,
  ) {}

  // ── GET /search/available-slots — real slot availability for hero widget ──
  @Public() @Get('available-slots')
  async getAvailableSlots(@Query('date') date?: string, @Query('roleCode') roleCode?: string) {
    if (!date || !roleCode) return { success: false, message: 'date and roleCode are required' };
    try {
      const data = await this.searchService.getAvailableSlots(date, roleCode);
      return { success: true, data };
    } catch (error) {
      console.error('GET /search/available-slots error:', error);
      return { success: true, data: { slots: [], providerCount: 0 } };
    }
  }

  /** GET /api/search/providers?type=X — THE GENERIC ENDPOINT (primary) */
  @Public()
  @Get('providers')
  async searchProviders(
    @Query('type') type: string, @Query('q') q?: string,
    @Query('page') page?: string, @Query('limit') limit?: string,
    @Query('specialty') specialty?: string,
    @Query('serviceId') serviceId?: string,
    @Query('entityId') entityId?: string,
  ) {
    const result = await this.searchService.searchProviders(
      type, q, page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined, specialty, serviceId, entityId,
    );
    return { success: true, ...result };
  }

  // ─── Alias routes (redirect to generic) — for backward compatibility ──
  // These call the same generic service. Once frontend is fully refactored, remove them.

  @Public() @Get('doctors')
  async searchDoctors(@Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string, @Query('specialty') specialty?: string) {
    const query = specialty ? `${q || ''} ${specialty}`.trim() || undefined : q;
    const result = await this.searchService.searchProviders('DOCTOR', query, page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined);
    return { success: true, ...result };
  }

  @Public() @Get('nurses')
  async searchNurses(@Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    const result = await this.searchService.searchProviders('NURSE', q, page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined);
    return { success: true, ...result };
  }

  @Public() @Get('nannies')
  async searchNannies(@Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    const result = await this.searchService.searchProviders('NANNY', q, page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined);
    return { success: true, ...result };
  }

  @Public() @Get('lab-tests')
  async searchLabTests(@Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    try {
      const pageNum = Math.max(parseInt(page || '1'), 1);
      const limitNum = Math.min(parseInt(limit || '20'), 50);
      const where: any = {};
      if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }];
      const [tests, total] = await Promise.all([
        this.prisma.labTestCatalog.findMany({ where, include: { labTech: { include: { user: { select: { id: true, firstName: true, lastName: true, profileImage: true } } } } }, skip: (pageNum - 1) * limitNum, take: limitNum, orderBy: { name: 'asc' } }),
        this.prisma.labTestCatalog.count({ where }),
      ]);
      return { success: true, data: tests, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
    } catch { return { success: true, data: [], total: 0, page: 1, limit: 20, totalPages: 0 }; }
  }

  @Public() @Get('insurance')
  async searchInsurance(@Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    try {
      const pageNum = Math.max(parseInt(page || '1'), 1);
      const limitNum = Math.min(parseInt(limit || '20'), 50);
      const where: any = {};
      if (q) where.OR = [{ planName: { contains: q, mode: 'insensitive' } }];
      const [plans, total] = await Promise.all([
        this.prisma.insurancePlanListing.findMany({ where, include: { insuranceRep: { include: { user: { select: { id: true, firstName: true, lastName: true, profileImage: true } } } } }, skip: (pageNum - 1) * limitNum, take: limitNum }),
        this.prisma.insurancePlanListing.count({ where }),
      ]);
      return { success: true, data: plans, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
    } catch { return { success: true, data: [], total: 0, page: 1, limit: 20, totalPages: 0 }; }
  }

  @Public() @Get('emergency')
  async searchEmergency(@Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    try {
      const pageNum = Math.max(parseInt(page || '1'), 1);
      const limitNum = Math.min(parseInt(limit || '20'), 50);
      const where: any = {};
      if (q) where.OR = [{ serviceName: { contains: q, mode: 'insensitive' } }];
      const [services, total] = await Promise.all([
        this.prisma.emergencyServiceListing.findMany({ where, include: { worker: { include: { user: { select: { id: true, firstName: true, lastName: true, profileImage: true } } } } }, skip: (pageNum - 1) * limitNum, take: limitNum }),
        this.prisma.emergencyServiceListing.count({ where }),
      ]);
      return { success: true, data: services, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
    } catch { return { success: true, data: [], total: 0, page: 1, limit: 20, totalPages: 0 }; }
  }

  // ── GET /search/autocomplete — search autocomplete ──────────────────────
  @Public() @Get('autocomplete')
  async autocomplete(@Query('q') q?: string, @Query('category') category?: string, @Query('limit') limit?: string) {
    try {
      if (!q || q.length < 2) return { success: true, data: [] };
      const take = Math.min(parseInt(limit || '8'), 20);
      const results: any[] = [];

      if (!category || category === 'providers') {
        const providers = await this.prisma.user.findMany({
          where: { accountStatus: 'active', userType: { notIn: ['MEMBER' as any, 'CORPORATE_ADMIN' as any] }, OR: [{ firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }] },
          select: { id: true, firstName: true, lastName: true, userType: true, profileImage: true },
          take,
        });
        providers.forEach(p => results.push({ id: p.id, label: `${p.firstName} ${p.lastName}`, type: 'provider', category: p.userType, image: p.profileImage }));
      }

      if (!category || category === 'products') {
        const items = await this.prisma.providerInventoryItem.findMany({
          where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
          select: { id: true, name: true, category: true, price: true },
          take,
        });
        items.forEach(i => results.push({ id: i.id, label: i.name, type: 'product', category: i.category, price: i.price }));
      }

      return { success: true, data: results.slice(0, take) };
    } catch { return { success: true, data: [] }; }
  }

  // ── GET /search/services — unified cross-role service discovery ────────
  // Returns services from the entire PlatformService catalog, overlaid with
  // ProviderServiceConfig rows so a patient finds "consultation" across all
  // provider roles in one search.
  @Public() @Get('services')
  async searchServices(
    @Query('q') q?: string,
    @Query('providerType') providerType?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const take = Math.min(parseInt(limit || '30'), 100);
      const where: any = { isActive: true };
      if (q) {
        where.OR = [
          { serviceName: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
        ];
      }
      if (providerType) where.providerType = providerType.toUpperCase();
      if (category) where.category = { contains: category, mode: 'insensitive' };

      const services = await this.prisma.platformService.findMany({
        where, take, orderBy: { serviceName: 'asc' },
      });

      // Count active providers per service in one grouped query (avoids N+1 and the broken `include: { provider }`)
      const providerCounts = await this.prisma.providerServiceConfig.groupBy({
        by: ['platformServiceId'],
        where: { platformServiceId: { in: services.map(s => s.id) }, isActive: true },
        _count: { id: true },
      });
      const countMap: Record<string, number> = {};
      for (const pc of providerCounts) countMap[pc.platformServiceId] = pc._count.id;

      const results = services.map(svc => ({
        id: svc.id,
        serviceName: svc.serviceName,
        category: svc.category,
        description: svc.description,
        providerType: svc.providerType,
        defaultPrice: svc.defaultPrice,
        currency: svc.currency,
        duration: svc.duration,
        iconKey: (svc as any).iconKey ?? null,
        emoji: (svc as any).emoji ?? null,
        imageUrl: (svc as any).imageUrl ?? null,
        providerCount: countMap[svc.id] ?? 0,
        sampleProviders: [],
      }));

      return { success: true, data: results, total: results.length };
    } catch (error) {
      console.error('GET /search/services error:', error);
      return { success: false, data: [], message: 'Search failed' };
    }
  }

  // ── GET /search/organizations — healthcare entity search ────────────────
  @Public() @Get('organizations')
  async searchOrganizations(
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const pageNum = Math.max(parseInt(page || '1'), 1);
      const take = Math.min(parseInt(limit || '20'), 100);
      const skip = (pageNum - 1) * take;

      const where: any = { isActive: true };
      if (type) where.type = type;
      if (city) where.city = { contains: city, mode: 'insensitive' };
      if (country) where.country = country.toUpperCase();
      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
          { address: { contains: q, mode: 'insensitive' } },
        ];
      }

      const [entities, total] = await Promise.all([
        (this.prisma.healthcareEntity as any).findMany({
          where,
          include: {
            providers: {
              where: { isActive: true },
              include: {
                provider: {
                  select: { id: true, firstName: true, lastName: true, userType: true, profileImage: true },
                },
              },
              take: 5,
            },
          },
          skip,
          take,
          orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
        }),
        (this.prisma.healthcareEntity as any).count({ where }),
      ]);

      return {
        success: true,
        data: entities.map((e: any) => ({
          ...e,
          providerCount: e.providers.length,
          sampleProviders: e.providers.slice(0, 3).map((wp: any) => ({
            id: wp.provider.id,
            name: `${wp.provider.firstName} ${wp.provider.lastName}`,
            userType: wp.provider.userType,
            profileImage: wp.provider.profileImage,
            role: wp.role,
          })),
        })),
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take),
      };
    } catch (error) {
      console.error('GET /search/organizations error:', error);
      return { success: false, data: [], message: 'Search failed' };
    }
  }

  // ── GET /search/medicines — medicine/inventory search ───────────────────
  @Public() @Get('medicines')
  async searchMedicines(@Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    try {
      const pageNum = Math.max(parseInt(page || '1'), 1);
      const limitNum = Math.min(parseInt(limit || '20'), 50);
      const where: any = { isActive: true, category: { in: ['medication', 'vitamins', 'supplements'] } };
      if (q) where.name = { contains: q, mode: 'insensitive' };
      const [items, total] = await Promise.all([
        this.prisma.providerInventoryItem.findMany({ where, skip: (pageNum - 1) * limitNum, take: limitNum, orderBy: { name: 'asc' } }),
        this.prisma.providerInventoryItem.count({ where }),
      ]);
      return { success: true, data: items, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
    } catch { return { success: true, data: [], total: 0, page: 1, limit: 20, totalPages: 0 }; }
  }
}
