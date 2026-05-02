import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthStreakService } from './health-streak.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('Health')
@Controller('health-streak')
export class HealthStreakController {
  constructor(private service: HealthStreakService) {}

  @Get()
  async get(@CurrentUser() user: JwtPayload) {
    return { success: true, data: await this.service.get(user.sub) };
  }

  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  async checkIn(@CurrentUser() user: JwtPayload) {
    return { success: true, data: await this.service.checkIn(user.sub) };
  }
}
