import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, CopyConditions } from 'minio';
import type { MinioConfig } from '../../../config/app.config';
import {
  InvalidBucketException,
  DownloadFailedException,
  ObjectNotFoundException,
  StorageUnavailableException,
  UploadFailedException,
} from '../exceptions/storage.exceptions';
import type {
  StorageMetadata,
  StorageObject,
  StorageProvider,
  StorageUpload,
  StorageBucket,
} from '../interfaces/storage.interface';

@Injectable()
export class MinioProvider implements StorageProvider {
  private readonly client: Client;
  private readonly buckets: Record<StorageBucket, string>;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const minio = config.getOrThrow<MinioConfig>('minio');
    const endpointUrl = /^https?:\/\//u.test(minio.endpoint) ? new URL(minio.endpoint) : undefined;
    const endpoint = endpointUrl?.hostname ?? minio.endpoint.replace(/\/$/u, '');
    this.client = new Client({
      endPoint: endpoint,
      port: endpointUrl?.port ? Number(endpointUrl.port) : minio.port,
      useSSL: endpointUrl?.protocol === 'https:' || minio.useSSL,
      accessKey: minio.accessKey,
      secretKey: minio.secretKey,
    });
    this.buckets = minio.buckets;
  }

  private bucket(bucket: StorageBucket): string {
    const name = this.buckets[bucket];
    if (!name) throw new InvalidBucketException(bucket);
    return name;
  }

  async ensureBuckets(): Promise<void> {
    try {
      for (const bucket of Object.values(this.buckets)) {
        if (!(await this.client.bucketExists(bucket))) await this.client.makeBucket(bucket);
      }
    } catch (error) {
      throw new StorageUnavailableException(error instanceof Error ? error.message : undefined);
    }
  }

  async upload(input: StorageUpload): Promise<StorageMetadata> {
    try {
      const metadata = this.toMinioMetadata(input.metadata);
      await this.client.putObject(
        this.bucket(input.bucket),
        input.key,
        input.body,
        input.size,
        metadata,
      );
      return this.getMetadata(input.bucket, input.key);
    } catch (error) {
      if (this.isNotFound(error)) throw new ObjectNotFoundException();
      throw new UploadFailedException(error instanceof Error ? error.message : undefined);
    }
  }

  async download(bucket: StorageBucket, key: string): Promise<StorageObject> {
    try {
      const body = await this.client.getObject(this.bucket(bucket), key);
      const metadata = await this.getMetadata(bucket, key);
      return { bucket, key, body, metadata };
    } catch (error) {
      if (this.isNotFound(error)) throw new ObjectNotFoundException();
      throw new DownloadFailedException(error instanceof Error ? error.message : undefined);
    }
  }

  async getMetadata(bucket: StorageBucket, key: string): Promise<StorageMetadata> {
    try {
      const stat = await this.client.statObject(this.bucket(bucket), key);
      return {
        bucket,
        key,
        contentLength: stat.size,
        contentType: stat.metaData?.['content-type'],
        etag: stat.etag,
        lastModified: stat.lastModified,
        ...this.fromMinioMetadata(stat.metaData),
      };
    } catch (error) {
      this.throwMapped(error);
    }
  }

  async delete(bucket: StorageBucket, key: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket(bucket), key);
    } catch (error) {
      this.throwMapped(error);
    }
  }

  async exists(bucket: StorageBucket, key: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket(bucket), key);
      return true;
    } catch (error) {
      if (this.isNotFound(error)) return false;
      throw new StorageUnavailableException(error instanceof Error ? error.message : undefined);
    }
  }

  async copy(
    source: { bucket: StorageBucket; key: string },
    target: StorageUpload,
  ): Promise<StorageMetadata> {
    try {
      const sourcePath = `/${this.bucket(source.bucket)}/${source.key}`;
      await this.client.copyObject(
        this.bucket(target.bucket),
        target.key,
        sourcePath,
        new CopyConditions(),
      );
      return this.getMetadata(target.bucket, target.key);
    } catch (error) {
      this.throwMapped(error);
    }
  }

  async move(
    source: { bucket: StorageBucket; key: string },
    target: StorageUpload,
  ): Promise<StorageMetadata> {
    const result = await this.copy(source, target);
    await this.delete(source.bucket, source.key);
    return result;
  }

  generatePresignedUrl(
    bucket: StorageBucket,
    key: string,
    expiresInSeconds: number,
  ): Promise<string> {
    return this.client.presignedGetObject(this.bucket(bucket), key, expiresInSeconds);
  }

  private toMinioMetadata(metadata?: StorageUpload['metadata']): Record<string, string> {
    return Object.fromEntries(
      Object.entries(metadata ?? {})
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [`x-amz-meta-${key}`, String(value)]),
    );
  }

  private fromMinioMetadata(metadata?: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(metadata ?? {})
        .filter(([key]) => key.toLowerCase().startsWith('x-amz-meta-'))
        .map(([key, value]) => [key.slice('x-amz-meta-'.length), value]),
    );
  }

  private isNotFound(error: unknown): boolean {
    return Boolean(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      ['NotFound', 'NoSuchKey', 'NoSuchBucket'].includes(String(error.code)),
    );
  }

  private throwMapped(error: unknown): never {
    if (this.isNotFound(error)) throw new ObjectNotFoundException();
    throw new StorageUnavailableException(error instanceof Error ? error.message : undefined);
  }
}
