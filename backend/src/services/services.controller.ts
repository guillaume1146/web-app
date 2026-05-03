import { Controller, Get, Post, Patch, Param, Query, Body, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { CreateCustomServiceDto } from './dto/create-custom-service.dto';
import { UpdateServiceConfigDto } from './dto/update-service-config.dto';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private prisma: PrismaService) {}

  /** GET /api/services/catalog — grouped by "providerType — category" */
  @Public()
  @Get('catalog')
  async catalog(@Query('providerType') providerType?: string, @Query('countryCode') countryCode?: string) {
    const where: any = { isActive: true };
    // Normalise providerType — frontend sometimes passes the URL slug
    // (lowercase "doctor") instead of the canonical enum code ("DOCTOR").
    // Coerce to uppercase to avoid PrismaClientValidationError on the enum.
    if (providerType) where.providerType = providerType.toUpperCase();
    if (countryCode) where.OR = [{ countryCode }, { countryCode: null }];

    const services = await this.prisma.platformService.findMany({
      where,
      orderBy: [{ providerType: 'asc' }, { category: 'asc' }, { serviceName: 'asc' }],
      select: {
        id: true, providerType: true, serviceName: true, category: true,
        description: true, defaultPrice: true, currency: true, duration: true,
        isDefault: true, countryCode: true,
      },
    });

    // Group by "providerType — category" to match frontend expectation
    const grouped: Record<string, Array<{ id: string; serviceName: string; defaultPrice: number; description: string | null; duration: number | null; isDefault: boolean }>> = {};
    for (const svc of services) {
      const key = `${svc.providerType} — ${svc.category}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        id: svc.id,
        serviceName: svc.serviceName,
        defaultPrice: svc.defaultPrice,
        description: svc.description,
        duration: svc.duration,
        isDefault: svc.isDefault,
      });
    }

    const data = Object.entries(grouped).map(([category, items]) => ({ category, services: items }));
    return { success: true, data };
  }

  /** GET /api/services/provider/:userId — public: provider's active services for profile tab */
  @Public()
  @Get('provider/:userId')
  async providerServices(@Param('userId') userId: string) {
    const configs = await this.prisma.providerServiceConfig.findMany({
      where: { providerUserId: userId, isActive: true },
      include: {
        platformService: {
          select: {
            id: true, serviceName: true, category: true,
            description: true, defaultPrice: true, duration: true, providerType: true,
          },
        },
      },
      orderBy: [{ platformService: { category: 'asc' } }],
    });
    return { success: true, data: configs };
  }

  /** GET /api/services/my-services — provider's configured services */
  @Get('my-services')
  async myServices(@CurrentUser() user: JwtPayload) {
    const configs = await this.prisma.providerServiceConfig.findMany({
      where: { providerUserId: user.sub },
      include: { platformService: true },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: configs };
  }

  /** PATCH /api/services/my-services — update price/active */
  @Patch('my-services')
  async updateMyService(@Body() body: UpdateServiceConfigDto, @CurrentUser() user: JwtPayload) {
    const config = await this.prisma.providerServiceConfig.findUnique({ where: { id: body.configId } });
    if (!config || config.providerUserId !== user.sub) return { success: false, message: 'Not found' };
    const data: any = {};
    if (body.priceOverride !== undefined) data.priceOverride = body.priceOverride;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    const updated = await this.prisma.providerServiceConfig.update({ where: { id: body.configId }, data });
    return { success: true, data: updated };
  }

  /**
   * POST /api/services/custom — create a service.
   *
   * Open to any authenticated PROVIDER user (not MEMBER, not REGIONAL_ADMIN —
   * admins have the full CRUD elsewhere). Sets `createdByProviderId` so the
   * library can attribute it + auto-assigns to the creator's own catalog.
   *
   * Providers creating services is an explicit design choice:
   * the platform catalog is shared, but each provider can add their own
   * niche service (e.g. a specific allergy panel) without waiting on
   * regional-admin approval. The `isDefault: false` flag keeps it out of
   * the "auto-assigned to new providers" group.
   */
  @Post('custom')
  async createCustom(@Body() body: CreateCustomServiceDto, @CurrentUser() user: JwtPayload) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { userType: true, regionId: true },
    });
    if (!dbUser) throw new NotFoundException('User not found');
    if (dbUser.userType === 'MEMBER') {
      throw new ForbiddenException('Members cannot create services. Providers and admins can.');
    }

    // Validate that at least one workflow template covers this provider type.
    // Every booking needs a workflow; a service without one is un-bookable.
    const templateExists = await this.prisma.workflowTemplate.findFirst({
      where: { providerType: dbUser.userType, isActive: true },
      select: { id: true },
    });
    if (!templateExists) {
      throw new ForbiddenException(
        `No workflow template exists for provider type "${dbUser.userType}". ` +
        `A regional admin must create a workflow template for this role before services can be added.`,
      );
    }

    const service = await this.prisma.platformService.create({
      data: {
        serviceName: body.name,
        description: body.description,
        providerType: dbUser.userType as any,
        category: body.category || 'custom',
        defaultPrice: body.price || 0,
        duration: body.duration || 30,
        isDefault: false,
        isActive: true,
        createdByProviderId: user.sub,
      },
    });
    // Auto-assign to creator's own catalog
    await this.prisma.providerServiceConfig.create({
      data: { platformServiceId: service.id, providerUserId: user.sub, isActive: true },
    });
    return { success: true, data: service };
  }
}
