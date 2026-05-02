import { Module } from '@nestjs/common';
import { RegionalController } from './regional.controller';
import { RegionalService } from './regional.service';

@Module({ controllers: [RegionalController], providers: [RegionalService] })
export class RegionalModule {}
