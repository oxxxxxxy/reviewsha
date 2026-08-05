import { Module } from '@nestjs/common';
import { ApiLoggerService } from '../../common/logger/api-logger.service';
import { RepositoriesModule } from '../../repositories';
import { QueueModule } from '../queue/queue.module';
import { UploadsModule } from '../uploads/uploads.module';
import { PipelineEvents } from './pipeline.events';
import { PipelineController } from './pipeline.controller';
import { PipelineService } from './pipeline.service';

@Module({
  imports: [RepositoriesModule, QueueModule, UploadsModule],
  controllers: [PipelineController],
  providers: [ApiLoggerService, PipelineEvents, PipelineService],
  exports: [PipelineEvents, PipelineService],
})
export class PipelineModule {}
