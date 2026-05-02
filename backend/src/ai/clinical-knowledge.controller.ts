import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ClinicalKnowledgeService } from './clinical-knowledge.service';

/**
 * Admin CRUD for the AI's clinical knowledge base. Regional admins can
 * add / edit / deactivate entries without touching code. Every mutation
 * invalidates the in-memory cache in `ClinicalKnowledgeService` so the
 * next AI chat picks up the change immediately.
 */
@ApiTags('Admin — Clinical Knowledge')
@UseGuards(AdminGuard)
@Controller('admin/clinical-knowledge')
export class ClinicalKnowledgeController {
  constructor(
    private prisma: PrismaService,
    private cache: ClinicalKnowledgeService,
  ) {}

  @Get()
  async list() {
    const rows = await this.prisma.clinicalKnowledge.findMany({
      orderBy: [{ active: 'desc' }, { category: 'asc' }, { conditionKey: 'asc' }],
    });
    return { success: true, data: rows };
  }

  @Post()
  async create(@Body() body: {
    conditionKey: string; aliases?: string[]; dietaryGuidance: string;
    category?: string; sources?: string[]; active?: boolean;
  }) {
    try {
      const row = await this.prisma.clinicalKnowledge.create({
        data: {
          conditionKey: body.conditionKey.trim().toLowerCase(),
          aliases: (body.aliases ?? []).map((a) => a.trim().toLowerCase()),
          dietaryGuidance: body.dietaryGuidance.trim(),
          category: body.category ?? 'nutrition',
          sources: body.sources ?? [],
          active: body.active ?? true,
        },
      });
      this.cache.invalidate();
      return { success: true, data: row };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create entry',
      };
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<{
    conditionKey: string; aliases: string[]; dietaryGuidance: string;
    category: string; sources: string[]; active: boolean;
  }>) {
    const data: any = {};
    if (body.conditionKey !== undefined) data.conditionKey = body.conditionKey.trim().toLowerCase();
    if (body.aliases !== undefined) data.aliases = body.aliases.map((a) => a.trim().toLowerCase());
    if (body.dietaryGuidance !== undefined) data.dietaryGuidance = body.dietaryGuidance.trim();
    if (body.category !== undefined) data.category = body.category;
    if (body.sources !== undefined) data.sources = body.sources;
    if (body.active !== undefined) data.active = body.active;

    const row = await this.prisma.clinicalKnowledge.update({ where: { id }, data });
    this.cache.invalidate();
    return { success: true, data: row };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.clinicalKnowledge.delete({ where: { id } });
    this.cache.invalidate();
    return { success: true, data: { id } };
  }
}
