import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RepositoriesModule } from '../../repositories';
import { StorageModule } from '../storage/storage.module';
import { ApiLoggerService } from '../../common/logger/api-logger.service';
import { UploadsController } from './controllers/uploads.controller';
import { UploadEvents } from './events/upload.events';
import { UploadsService } from './services/uploads.service';
import { ZipValidator } from './validators/zip.validator';

@Module({
  imports: [DatabaseModule, RepositoriesModule, StorageModule],
  controllers: [UploadsController],
  providers: [ApiLoggerService, UploadEvents, UploadsService, ZipValidator],
  exports: [UploadsService],
})
export class UploadsModule {}
