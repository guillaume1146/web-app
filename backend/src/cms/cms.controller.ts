import { Controller, Get, Post, Put, Patch, Delete, Query, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { Public } from '../auth/decorators/public.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateHeroSlideDto } from './dto/create-hero-slide.dto';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { CreateSectionDto } from './dto/create-section.dto';

@ApiTags('CMS')
@Controller('cms')
@Public()
export class CmsController {
  constructor(private cmsService: CmsService) {}

  /** GET /api/cms/sections — CMS sections for landing page */
  @Get('sections')
  async sections(@Query('countryCode') countryCode?: string) {
    try {
      const data = await this.cmsService.getSections(countryCode);
      return { success: true, data };
    } catch {
      return { success: true, data: { sections: [], sectionMap: {} } };
    }
  }

  /** GET /api/cms/hero-slides */
  @Get('hero-slides')
  async heroSlides(@Query('countryCode') countryCode?: string) {
    try {
      const slides = await this.cmsService.getHeroSlides(countryCode);
      return { success: true, data: slides };
    } catch (error) {
      console.error('GET /cms/hero-slides error:', error);
      return { success: false, message: 'Failed to fetch hero slides' };
    }
  }

  /** GET /api/cms/testimonials */
  @Get('testimonials')
  async testimonials() {
    try {
      const testimonials = await this.cmsService.getTestimonials();
      return { success: true, data: testimonials };
    } catch (error) {
      console.error('GET /cms/testimonials error:', error);
      return { success: false, message: 'Failed to fetch testimonials' };
    }
  }

  // ─── CMS Write Operations (Admin Only) ────────────────────────────────────

  @UseGuards(AdminGuard) @Post('hero-slides')
  async createHeroSlide(@Body() body: CreateHeroSlideDto) {
    try {
      const slide = await this.cmsService.createHeroSlide(body);
      return { success: true, data: slide };
    } catch { return { success: false, message: 'Failed to create hero slide' }; }
  }

  @UseGuards(AdminGuard) @Put('hero-slides/:id')
  async putHeroSlide(@Param('id') id: string, @Body() body: CreateHeroSlideDto) {
    return this.updateHeroSlide(id, body);
  }

  @UseGuards(AdminGuard) @Patch('hero-slides/:id')
  async updateHeroSlide(@Param('id') id: string, @Body() body: CreateHeroSlideDto) {
    try {
      const slide = await this.cmsService.updateHeroSlide(id, body);
      return { success: true, data: slide };
    } catch { return { success: false, message: 'Failed to update hero slide' }; }
  }

  @UseGuards(AdminGuard) @Delete('hero-slides/:id')
  async deleteHeroSlide(@Param('id') id: string) {
    try {
      await this.cmsService.deactivateHeroSlide(id);
      return { success: true, message: 'Hero slide deactivated' };
    } catch { return { success: false, message: 'Failed to delete hero slide' }; }
  }

  @UseGuards(AdminGuard) @Post('testimonials')
  async createTestimonial(@Body() body: CreateTestimonialDto) {
    try {
      const t = await this.cmsService.createTestimonial(body);
      return { success: true, data: t };
    } catch { return { success: false, message: 'Failed to create testimonial' }; }
  }

  @UseGuards(AdminGuard) @Put('testimonials/:id')
  async putTestimonial(@Param('id') id: string, @Body() body: CreateTestimonialDto) {
    return this.updateTestimonial(id, body);
  }

  @UseGuards(AdminGuard) @Patch('testimonials/:id')
  async updateTestimonial(@Param('id') id: string, @Body() body: CreateTestimonialDto) {
    try {
      const t = await this.cmsService.updateTestimonial(id, body);
      return { success: true, data: t };
    } catch { return { success: false, message: 'Failed to update testimonial' }; }
  }

  @UseGuards(AdminGuard) @Delete('testimonials/:id')
  async deleteTestimonial(@Param('id') id: string) {
    try {
      await this.cmsService.deactivateTestimonial(id);
      return { success: true, message: 'Testimonial deactivated' };
    } catch { return { success: false, message: 'Failed to delete testimonial' }; }
  }

  @UseGuards(AdminGuard) @Post('sections')
  async createSection(@Body() body: CreateSectionDto) {
    try {
      const s = await this.cmsService.createSection(body);
      return { success: true, data: s };
    } catch { return { success: false, message: 'Failed to create section' }; }
  }

  @UseGuards(AdminGuard) @Put('sections/:sectionType')
  async putSection(@Param('sectionType') sectionType: string, @Body() body: CreateSectionDto) {
    return this.updateSection(sectionType, body);
  }

  @UseGuards(AdminGuard) @Patch('sections/:sectionType')
  async updateSection(@Param('sectionType') sectionType: string, @Body() body: CreateSectionDto) {
    try {
      const s = await this.cmsService.updateSection(sectionType, body);
      if (!s) return { success: false, message: 'Section not found' };
      return { success: true, data: s };
    } catch { return { success: false, message: 'Failed to update section' }; }
  }
}
