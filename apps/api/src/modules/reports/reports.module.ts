import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../../repositories';
import { ReportsController } from './controllers/reports.controller';
import { ReportsService } from './services/reports.service';
import { StorageModule } from '../storage/storage.module';
import { ReportsRepository } from './repositories/reports.repository';

@Module({
  imports: [RepositoriesModule, StorageModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository],
  exports: [ReportsService],
})
export class ReportsModule {}
