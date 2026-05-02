import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Subscriptions')
@Controller()
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('subscriptions')
  async findPlans(@Query('type') type?: string, @Query('countryCode') countryCode?: string) {
    const data = await this.subscriptionsService.findPlans({ type, countryCode });
    return { success: true, data };
  }

  @Public()
  @Get('subscriptions/:id')
  async findPlanById(@Param('id') id: string) {
    return { success: true, data: await this.subscriptionsService.findPlanById(id) };
  }

  @Public()
  @Get('regions')
  async findRegions() {
    return { success: true, data: await this.subscriptionsService.findRegions() };
  }

  @Public()
  @Get('regions/:id')
  async findRegionById(@Param('id') id: string) {
    return { success: true, data: await this.subscriptionsService.findRegionById(id) };
  }
}
