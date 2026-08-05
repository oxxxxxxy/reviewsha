import { Global, Module } from '@nestjs/common';
import { ApiLoggerService } from '../../common/logger/api-logger.service';
import { MinioProvider } from './providers/minio.provider';
import { StorageService } from './services/storage.service';

@Global()
@Module({
  providers: [
    ApiLoggerService,
    MinioProvider,
    {
      provide: StorageService,
      useFactory: (provider: MinioProvider, logger: ApiLoggerService) =>
        new StorageService(provider, logger),
      inject: [MinioProvider, ApiLoggerService],
    },
  ],
  exports: [StorageService, MinioProvider],
})
export class StorageModule {}
