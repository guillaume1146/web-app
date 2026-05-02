import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
@SkipThrottle()
@Public()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    // Verify DB connectivity
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'degraded', database: 'disconnected', timestamp: new Date().toISOString() };
    }
  }
}
