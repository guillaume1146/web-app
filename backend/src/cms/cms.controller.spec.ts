import { Test, TestingModule } from '@nestjs/testing';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';

/**
 * Regression: admin content managers on the frontend still use HTTP PUT for
 * updates. Backend was @Patch-only, which 404'd every update. We added @Put
 * aliases that delegate to the Patch handlers — these tests pin that in.
 */
describe('CmsController — PUT aliases for PATCH endpoints', () => {
  let controller: CmsController;
  let service: jest.Mocked<Partial<CmsService>>;

  beforeEach(async () => {
    service = {
      updateHeroSlide: jest.fn().mockResolvedValue({ id: 'HS1', title: 'Updated' }),
      updateTestimonial: jest.fn().mockResolvedValue({ id: 'T1', author: 'Updated' }),
      updateSection: jest.fn().mockResolvedValue({ sectionType: 'hero', active: true }),
    } as any;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CmsController],
      providers: [{ provide: CmsService, useValue: service }],
    }).compile();
    controller = module.get<CmsController>(CmsController);
  });

  it('PUT /cms/hero-slides/:id delegates to the PATCH handler', async () => {
    const body: any = { title: 'New title', imageUrl: '/x.png', href: '/', order: 1 };
    const res = await controller.putHeroSlide('HS1', body);
    expect(service.updateHeroSlide).toHaveBeenCalledWith('HS1', body);
    expect(res).toEqual({ success: true, data: { id: 'HS1', title: 'Updated' } });
  });

  it('PUT /cms/testimonials/:id delegates to the PATCH handler', async () => {
    const body: any = { author: 'User', content: 'Great' };
    const res = await controller.putTestimonial('T1', body);
    expect(service.updateTestimonial).toHaveBeenCalledWith('T1', body);
    expect(res).toEqual({ success: true, data: { id: 'T1', author: 'Updated' } });
  });

  it('PUT /cms/sections/:sectionType delegates to the PATCH handler', async () => {
    const body: any = { sectionType: 'hero', active: true };
    const res = await controller.putSection('hero', body);
    expect(service.updateSection).toHaveBeenCalledWith('hero', body);
    expect(res).toEqual({ success: true, data: { sectionType: 'hero', active: true } });
  });
});
