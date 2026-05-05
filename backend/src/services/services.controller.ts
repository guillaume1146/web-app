import { Controller, Get, Post, Patch, Delete, Param, Query, Body, NotFoundException, ForbiddenException, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateCustomServiceDto } from './dto/create-custom-service.dto';
import { UpdateServiceConfigDto } from './dto/update-service-config.dto';
import { CreatePlatformServiceDto } from './dto/create-platform-service.dto';
import { UpdatePlatformServiceDto } from './dto/update-platform-service.dto';

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
        isDefault: true, countryCode: true, iconKey: true, emoji: true,
      },
    });

    // Group by "providerType — category" to match frontend expectation
    const grouped: Record<string, Array<{ id: string; serviceName: string; defaultPrice: number; description: string | null; duration: number | null; isDefault: boolean; iconKey: string | null; emoji: string | null }>> = {};
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
        iconKey: svc.iconKey,
        emoji: svc.emoji,
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
    const configs: any[] = await (this.prisma.providerServiceConfig as any).findMany({
      where: { providerUserId: user.sub },
      include: {
        platformService: true,
        workflowTemplates: {
          include: {
            workflowTemplate: {
              select: { id: true, name: true, serviceMode: true, steps: true, isActive: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Flatten for frontend: each config gets a `workflows` array
    const data = configs.map((c: any) => ({
      ...c,
      workflows: (c.workflowTemplates ?? [])
        .map((link: any) => link.workflowTemplate)
        .filter((wt: any) => wt?.isActive),
    }));
    return { success: true, data };
  }

  /** POST /api/services/my-services/add — add a catalog service to provider's offerings */
  @Post('my-services/add')
  async addMyService(
    @Body() body: { platformServiceId: string; priceOverride?: number; workflowTemplateIds: string[] },
    @CurrentUser() user: JwtPayload,
  ) {
    if (!body.platformServiceId) throw new BadRequestException('platformServiceId is required');
    if (!body.workflowTemplateIds?.length) throw new BadRequestException('At least one workflow template is required');

    // Upsert the config (re-activating if previously removed)
    const config: any = await (this.prisma.providerServiceConfig as any).upsert({
      where: {
        platformServiceId_providerUserId: {
          platformServiceId: body.platformServiceId,
          providerUserId: user.sub,
        },
      },
      update: { isActive: true, priceOverride: body.priceOverride ?? null },
      create: {
        platformServiceId: body.platformServiceId,
        providerUserId: user.sub,
        priceOverride: body.priceOverride ?? null,
        isActive: true,
      },
    });

    // Replace workflow links
    await (this.prisma.providerServiceWorkflow as any).deleteMany({
      where: { providerServiceConfigId: config.id },
    });
    for (const tplId of body.workflowTemplateIds) {
      await (this.prisma.providerServiceWorkflow as any).create({
        data: { providerServiceConfigId: config.id, workflowTemplateId: tplId },
      });
    }

    return { success: true, data: config };
  }

  /** DELETE /api/services/my-services/:platformServiceId — remove a service from provider's offerings */
  @Delete('my-services/:platformServiceId')
  async removeMyService(
    @Param('platformServiceId') platformServiceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const config: any = await (this.prisma.providerServiceConfig as any).findUnique({
      where: {
        platformServiceId_providerUserId: {
          platformServiceId,
          providerUserId: user.sub,
        },
      },
    });
    if (!config) throw new NotFoundException('Service config not found');
    await this.prisma.providerServiceConfig.update({
      where: { id: config.id },
      data: { isActive: false },
    });
    return { success: true, message: 'Service removed from your offerings' };
  }

  /** PATCH /api/services/my-services/:platformServiceId/workflows — set workflow templates for a service */
  @Patch('my-services/:platformServiceId/workflows')
  async updateServiceWorkflows(
    @Param('platformServiceId') platformServiceId: string,
    @Body() body: { workflowTemplateIds: string[] },
    @CurrentUser() user: JwtPayload,
  ) {
    if (!body.workflowTemplateIds?.length) throw new BadRequestException('At least one workflow template is required');

    const config: any = await (this.prisma.providerServiceConfig as any).findUnique({
      where: {
        platformServiceId_providerUserId: {
          platformServiceId,
          providerUserId: user.sub,
        },
      },
    });
    if (!config) throw new NotFoundException('Service config not found');

    // Replace all workflow links
    await (this.prisma.providerServiceWorkflow as any).deleteMany({
      where: { providerServiceConfigId: config.id },
    });
    for (const tplId of body.workflowTemplateIds) {
      await (this.prisma.providerServiceWorkflow as any).upsert({
        where: {
          providerServiceConfigId_workflowTemplateId: {
            providerServiceConfigId: config.id,
            workflowTemplateId: tplId,
          },
        },
        update: {},
        create: { providerServiceConfigId: config.id, workflowTemplateId: tplId },
      });
    }

    return { success: true, message: 'Workflow templates updated' };
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
        iconKey: body.iconKey || null,
        emoji: body.emoji || null,
        imageUrl: body.imageUrl || null,
      },
    });
    // Auto-assign to creator's own catalog
    await this.prisma.providerServiceConfig.create({
      data: { platformServiceId: service.id, providerUserId: user.sub, isActive: true },
    });
    return { success: true, data: service };
  }

  /** PATCH /api/services/custom/:id — provider updates their own custom service */
  @Patch('custom/:id')
  async updateCustom(@Param('id') id: string, @Body() body: CreateCustomServiceDto, @CurrentUser() user: JwtPayload) {
    const service = await this.prisma.platformService.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Service not found');
    if (service.createdByProviderId !== user.sub) throw new ForbiddenException('You can only edit services you created');

    const data: any = {};
    if (body.name !== undefined) data.serviceName = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.category !== undefined) data.category = body.category;
    if (body.price !== undefined) data.defaultPrice = body.price;
    if (body.duration !== undefined) data.duration = body.duration;
    if (body.iconKey !== undefined) data.iconKey = body.iconKey || null;
    if (body.emoji !== undefined) data.emoji = body.emoji || null;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null;

    const updated = await this.prisma.platformService.update({ where: { id }, data });
    return { success: true, data: updated };
  }

  /** DELETE /api/services/custom/:id — provider deletes their own custom service */
  @Delete('custom/:id')
  async deleteCustom(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const service = await this.prisma.platformService.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Service not found');
    if (service.createdByProviderId !== user.sub) throw new ForbiddenException('You can only delete services you created');
    await this.prisma.platformService.update({ where: { id }, data: { isActive: false } });
    return { success: true, message: 'Service removed' };
  }

  // ─── Admin CRUD for PlatformService ────────────────────────────────────────

  /** GET /api/services/admin — list all platform services (admin only) */
  @UseGuards(AdminGuard)
  @Get('admin')
  async adminList(@Query('providerType') providerType?: string, @Query('countryCode') countryCode?: string) {
    const where: any = {};
    if (providerType) where.providerType = providerType.toUpperCase();
    if (countryCode) where.countryCode = countryCode;
    const services = await this.prisma.platformService.findMany({
      where,
      orderBy: [{ providerType: 'asc' }, { category: 'asc' }, { serviceName: 'asc' }],
    });
    return { success: true, data: services };
  }

  /** POST /api/services/admin — create platform service (admin only) */
  @UseGuards(AdminGuard)
  @Post('admin')
  async adminCreate(@Body() dto: CreatePlatformServiceDto) {
    const service = await this.prisma.platformService.create({
      data: {
        providerType: dto.providerType.toUpperCase() as any,
        serviceName: dto.serviceName,
        category: dto.category,
        description: dto.description,
        defaultPrice: dto.defaultPrice ?? 0,
        currency: dto.currency ?? 'MUR',
        duration: dto.duration,
        isDefault: dto.isDefault ?? true,
        countryCode: dto.countryCode,
        iconKey: dto.iconKey,
        emoji: dto.emoji,
        requiredContentType: dto.requiredContentType,
        isActive: true,
      },
    });
    return { success: true, data: service };
  }

  /** GET /api/services/admin/:id — single service detail (admin only) */
  @UseGuards(AdminGuard)
  @Get('admin/:id')
  async adminGet(@Param('id') id: string) {
    const service = await this.prisma.platformService.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Service not found');
    return { success: true, data: service };
  }

  /** PATCH /api/services/admin/:id — update platform service (admin only) */
  @UseGuards(AdminGuard)
  @Patch('admin/:id')
  async adminUpdate(@Param('id') id: string, @Body() dto: UpdatePlatformServiceDto) {
    const existing = await this.prisma.platformService.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Service not found');
    const data: any = {};
    for (const k of ['serviceName', 'category', 'description', 'defaultPrice', 'currency', 'duration',
      'isDefault', 'isActive', 'countryCode', 'iconKey', 'emoji', 'requiredContentType']) {
      if ((dto as any)[k] !== undefined) data[k] = (dto as any)[k];
    }
    const updated = await this.prisma.platformService.update({ where: { id }, data });
    return { success: true, data: updated };
  }

  /** DELETE /api/services/admin/:id — soft-delete platform service (admin only) */
  @UseGuards(AdminGuard)
  @Delete('admin/:id')
  async adminDelete(@Param('id') id: string) {
    const existing = await this.prisma.platformService.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Service not found');
    await this.prisma.platformService.update({ where: { id }, data: { isActive: false } });
    return { success: true, message: 'Service deactivated' };
  }
}
