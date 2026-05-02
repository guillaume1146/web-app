import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService) {}

  async getSections(countryCode?: string) {
    const sections = await this.prisma.cmsSection.findMany({
      where: { isVisible: true, countryCode: countryCode || null },
      orderBy: { sortOrder: 'asc' },
    });
    const sectionMap: Record<string, unknown> = {};
    for (const s of sections) sectionMap[s.sectionType] = s.content;
    return { sections, sectionMap };
  }

  async getHeroSlides(countryCode?: string) {
    return this.prisma.cmsHeroSlide.findMany({
      where: { isActive: true, ...(countryCode ? { countryCode } : { countryCode: null }) },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getTestimonials() {
    return this.prisma.cmsTestimonial.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createHeroSlide(body: any) {
    return this.prisma.cmsHeroSlide.create({
      data: { title: body.title, subtitle: body.subtitle, imageUrl: body.imageUrl, ctaText: body.ctaText, ctaLink: body.ctaLink, sortOrder: body.sortOrder || 0, isActive: body.isActive ?? true, countryCode: body.countryCode || null },
    });
  }

  async updateHeroSlide(id: string, body: any) {
    return this.prisma.cmsHeroSlide.update({ where: { id }, data: body });
  }

  async deactivateHeroSlide(id: string) {
    await this.prisma.cmsHeroSlide.update({ where: { id }, data: { isActive: false } });
  }

  async createTestimonial(body: any) {
    return this.prisma.cmsTestimonial.create({
      data: { name: body.name, role: body.role, content: body.content, rating: body.rating || 5, imageUrl: body.imageUrl, isActive: body.isActive ?? true },
    });
  }

  async updateTestimonial(id: string, body: any) {
    return this.prisma.cmsTestimonial.update({ where: { id }, data: body });
  }

  async deactivateTestimonial(id: string) {
    await this.prisma.cmsTestimonial.update({ where: { id }, data: { isActive: false } });
  }

  async createSection(body: any) {
    return this.prisma.cmsSection.create({
      data: { sectionType: body.sectionType, content: body.content || {}, isVisible: body.isVisible ?? true, sortOrder: body.sortOrder || 0, countryCode: body.countryCode || null },
    });
  }

  async updateSection(sectionType: string, body: any) {
    const existing = await this.prisma.cmsSection.findFirst({ where: { sectionType } });
    if (!existing) return null;
    return this.prisma.cmsSection.update({ where: { id: existing.id }, data: body });
  }
}
