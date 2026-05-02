import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { RequiredDocumentsController } from './required-documents.controller';
import { RequiredDocumentsService } from './required-documents.service';
import { AppConfigService } from './app-config.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ConfigController, RequiredDocumentsController],
  providers: [AppConfigService, RequiredDocumentsService],
})
export class ConfigModule {}
