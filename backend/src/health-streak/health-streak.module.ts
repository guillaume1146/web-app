import { Module } from '@nestjs/common';
import { HealthStreakController } from './health-streak.controller';
import { HealthStreakService } from './health-streak.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HealthStreakController],
  providers: [HealthStreakService],
  exports: [HealthStreakService],
})
export class HealthStreakModule {}
