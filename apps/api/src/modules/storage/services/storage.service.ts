import { Injectable } from '@nestjs/common';
import { ApiLoggerService } from '../../../common/logger/api-logger.service';
import type {
  StorageBucket,
  StorageMetadata,
  StorageObject,
  StorageProvider,
  StorageUpload,
} from '../interfaces/storage.interface';

@Injectable()
export class StorageService {
  constructor(
    private readonly provider: StorageProvider,
    private readonly logger?: ApiLoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.provider.ensureBuckets();
  }

  async healthCheck(): Promise<void> {
    await this.provider.ensureBuckets();
  }

  upload(input: StorageUpload): Promise<StorageMetadata> {
    return this.measure(
      'upload',
      input.bucket,
      input.key,
      () => this.provider.upload(input),
      input.size,
    );
  }

  download(bucket: StorageBucket, key: string): Promise<StorageObject> {
    return this.measure('download', bucket, key, () => this.provider.download(bucket, key));
  }

  getObject(bucket: StorageBucket, key: string): Promise<StorageObject> {
    return this.download(bucket, key);
  }

  getMetadata(bucket: StorageBucket, key: string): Promise<StorageMetadata> {
    return this.measure('metadata', bucket, key, () => this.provider.getMetadata(bucket, key));
  }

  delete(bucket: StorageBucket, key: string): Promise<void> {
    return this.measure('delete', bucket, key, () => this.provider.delete(bucket, key));
  }

  exists(bucket: StorageBucket, key: string): Promise<boolean> {
    return this.provider.exists(bucket, key);
  }

  copy(
    source: { bucket: StorageBucket; key: string },
    target: StorageUpload,
  ): Promise<StorageMetadata> {
    return this.measure('copy', target.bucket, target.key, () =>
      this.provider.copy(source, target),
    );
  }

  move(
    source: { bucket: StorageBucket; key: string },
    target: StorageUpload,
  ): Promise<StorageMetadata> {
    return this.measure('move', target.bucket, target.key, () =>
      this.provider.move(source, target),
    );
  }

  generatePresignedUrl(
    bucket: StorageBucket,
    key: string,
    expiresInSeconds = 900,
  ): Promise<string> {
    return this.provider.generatePresignedUrl(bucket, key, expiresInSeconds);
  }

  private async measure<T>(
    operation: string,
    bucket: StorageBucket,
    key: string,
    callback: () => Promise<T>,
    size?: number,
  ): Promise<T> {
    const startedAt = Date.now();
    try {
      return await callback();
    } finally {
      this.logger?.log(
        `Storage ${operation} bucket=${bucket}${size === undefined ? '' : ` size=${size}`} durationMs=${Date.now() - startedAt}`,
        'StorageService',
      );
    }
  }
}
