import { Module } from '@nestjs/common';
import { HealthDataController } from './health-data.controller';
import { PatientsAliasController } from './patients-alias.controller';
import { HealthDataService } from './health-data.service';

@Module({
  controllers: [HealthDataController, PatientsAliasController],
  providers: [HealthDataService],
  exports: [HealthDataService],
})
export class HealthDataModule {}
