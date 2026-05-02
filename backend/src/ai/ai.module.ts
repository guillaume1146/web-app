import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { HealthTrackerController } from './health-tracker.controller';
import { HealthTrackerService } from './health-tracker.service';
import { ClinicalKnowledgeService } from './clinical-knowledge.service';
import { ClinicalKnowledgeController } from './clinical-knowledge.controller';
import { AiDriftDetectionService } from './drift-detection.service';

@Module({
  controllers: [AiController, HealthTrackerController, ClinicalKnowledgeController],
  providers: [AiService, HealthTrackerService, ClinicalKnowledgeService, AiDriftDetectionService],
  exports: [AiService, HealthTrackerService, ClinicalKnowledgeService, AiDriftDetectionService],
})
export class AiModule {}
