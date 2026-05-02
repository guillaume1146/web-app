import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AppConfigService } from './app-config.service';

@ApiTags('Config')
@Controller('config')
@Public()
export class ConfigController {
  constructor(private appConfigService: AppConfigService) {}

  @Get()
  getConfig() {
    return this.appConfigService.getConfig();
  }
}
