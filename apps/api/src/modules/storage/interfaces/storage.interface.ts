import type { Readable } from 'node:stream';

export type StorageBucket = 'projects' | 'reports' | 'temp';

export interface StorageObjectMetadata {
  readonly contentType?: string;
  readonly contentLength?: number;
  readonly checksum?: string;
  readonly ownerId?: string;
  readonly projectId?: string;
  readonly uploadId?: string;
  readonly [key: string]: string | number | Date | undefined;
}

export interface StorageUpload {
  readonly bucket: StorageBucket;
  readonly key: string;
  readonly body: Readable | Buffer | string;
  readonly size?: number;
  readonly metadata?: StorageObjectMetadata;
}

export interface StorageObject {
  readonly bucket: StorageBucket;
  readonly key: string;
  readonly body: Readable;
  readonly metadata: StorageObjectMetadata;
}

export interface StorageMetadata extends StorageObjectMetadata {
  readonly bucket: StorageBucket;
  readonly key: string;
  readonly etag?: string;
  readonly lastModified?: Date;
}

export interface StorageProvider {
  ensureBuckets(): Promise<void>;
  upload(input: StorageUpload): Promise<StorageMetadata>;
  download(bucket: StorageBucket, key: string): Promise<StorageObject>;
  getMetadata(bucket: StorageBucket, key: string): Promise<StorageMetadata>;
  delete(bucket: StorageBucket, key: string): Promise<void>;
  exists(bucket: StorageBucket, key: string): Promise<boolean>;
  copy(
    source: { bucket: StorageBucket; key: string },
    target: StorageUpload,
  ): Promise<StorageMetadata>;
  move(
    source: { bucket: StorageBucket; key: string },
    target: StorageUpload,
  ): Promise<StorageMetadata>;
  generatePresignedUrl(
    bucket: StorageBucket,
    key: string,
    expiresInSeconds: number,
  ): Promise<string>;
}
