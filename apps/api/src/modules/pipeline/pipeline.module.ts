import { Module } from '@nestjs/common';
import { ApiLoggerService } from '../../common/logger/api-logger.service';
import { RepositoriesModule } from '../../repositories';
import { QueueModule } from '../queue/queue.module';
import { UploadsModule } from '../uploads/uploads.module';
import { PipelineEvents } from './pipeline.events';
import { PipelineController } from './pipeline.controller';
import { PipelineService } from './pipeline.service';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

@Module({
  imports: [RepositoriesModule, QueueModule, UploadsModule],
  controllers: [PipelineController, AnalysisController],
  providers: [ApiLoggerService, PipelineEvents, PipelineService, AnalysisService],
  exports: [PipelineEvents, PipelineService],
})
export class PipelineModule {}
