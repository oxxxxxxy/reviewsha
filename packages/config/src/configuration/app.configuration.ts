export interface ApplicationConfiguration {
  readonly nodeEnv: 'development' | 'test' | 'production';
  readonly serviceName: string;
  readonly host: string;
  readonly port: number;
  readonly apiPrefix: string;
}

export interface DatabaseConfiguration {
  readonly url: string;
}

export interface RedisConfiguration {
  readonly url: string;
  readonly password?: string;
}

export interface MinioConfiguration {
  readonly endpoint: string;
  readonly accessKey: string;
  readonly secretKey: string;
  readonly buckets: readonly string[];
}

export interface JwtConfiguration {
  readonly accessSecret: string;
  readonly refreshSecret: string;
  readonly accessTtlSeconds: number;
  readonly refreshTtlSeconds: number;
}

export interface AiConfiguration {
  readonly provider: 'deepseek' | 'openai' | 'local' | 'mock';
}

export interface QueueConfiguration {
  readonly redisUrl: string;
  readonly queueNames: readonly string[];
}

export interface StorageConfiguration {
  readonly buckets: readonly string[];
  readonly maxUploadSizeBytes: number;
}

export interface ReviewshaConfiguration {
  readonly application: ApplicationConfiguration;
  readonly database: DatabaseConfiguration;
  readonly redis: RedisConfiguration;
  readonly minio: MinioConfiguration;
  readonly jwt: JwtConfiguration;
  readonly ai: AiConfiguration;
  readonly queue: QueueConfiguration;
  readonly storage: StorageConfiguration;
}
