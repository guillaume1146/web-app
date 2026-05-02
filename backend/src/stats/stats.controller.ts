import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Stats')
@Controller('stats')
@Public()
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get()
  async platformStats() {
    const data = await this.statsService.getPlatformStats();
    return { success: true, data };
  }
}
