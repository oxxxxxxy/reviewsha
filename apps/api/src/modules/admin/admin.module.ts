import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { QueueModule } from '../queue/queue.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAiSettingsService } from './admin-ai-settings.service';

@Module({
  imports: [DatabaseModule, QueueModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAiSettingsService],
  exports: [AdminService],
})
export class AdminModule {}
