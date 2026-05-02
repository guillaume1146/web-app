import { Module } from '@nestjs/common';
import { LegacyRoutesController } from './legacy-routes.controller';
import { WorkflowModule } from '../workflow/workflow.module';
import { BookingsModule } from '../bookings/bookings.module';
import { ProvidersModule } from '../providers/providers.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [WorkflowModule, BookingsModule, ProvidersModule, SearchModule],
  controllers: [LegacyRoutesController],
})
export class LegacyRoutesModule {}
