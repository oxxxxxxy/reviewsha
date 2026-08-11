import { Module } from '@nestjs/common';
import { WorkerConfigModule } from '../config/config.module';
import { WorkerDatabaseService } from './worker-database.service';

@Module({
  imports: [WorkerConfigModule],
  providers: [WorkerDatabaseService],
  exports: [WorkerDatabaseService],
})
export class WorkerDatabaseModule {}
