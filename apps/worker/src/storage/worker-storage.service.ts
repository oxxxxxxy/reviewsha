import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import type { Readable } from 'node:stream';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';

@Injectable()
export class WorkerStorageService {
  private readonly client: Client;
  private readonly tempBucket: string;

  constructor(
    @Inject(ConfigService) config: ConfigService,
    @Inject(WorkerLoggerService) private readonly logger: WorkerLoggerService,
  ) {
    const configuredEndpoint = config.getOrThrow<string>('worker.minioEndpoint');
    const endpointUrl = /^https?:\/\//u.test(configuredEndpoint)
      ? new URL(configuredEndpoint)
      : undefined;
    this.client = new Client({
      endPoint: endpointUrl?.hostname ?? configuredEndpoint,
      port: endpointUrl?.port
        ? Number(endpointUrl.port)
        : config.getOrThrow<number>('worker.minioPort'),
      useSSL:
        endpointUrl?.protocol === 'https:' || config.getOrThrow<boolean>('worker.minioUseSSL'),
      accessKey: config.getOrThrow<string>('worker.minioAccessKey'),
      secretKey: config.getOrThrow<string>('worker.minioSecretKey'),
    });
    this.tempBucket = process.env.MINIO_BUCKET_TEMP ?? 'temp';
  }

  async healthCheck(): Promise<void> {
    if (!(await this.client.bucketExists(this.tempBucket))) {
      await this.client.makeBucket(this.tempBucket);
    }
  }

  getObject(bucket: string, key: string): Promise<Readable> {
    return this.client.getObject(bucket, key);
  }

  async delete(bucket: string, key: string): Promise<void> {
    await this.client.removeObject(bucket, key);
  }

  logOperation(operation: string, jobId: string): void {
    this.logger.log(`Storage ${operation} jobId=${jobId}`, 'WorkerStorageService');
  }
}
