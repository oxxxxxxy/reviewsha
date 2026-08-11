export type WorkerConfig = {
  nodeEnv: string;
  workerName: string;
  redisRequired: boolean;
  concurrency: number;
  redisUrl: string;
  databaseUrl: string;
  minioEndpoint: string;
  minioAccessKey: string;
  minioSecretKey: string;
  minioPort: number;
  minioUseSSL: boolean;
  aiProvider: string;
  aiApiKey?: string;
  aiBaseUrl: string;
  aiModel: string;
  aiMaxTokens: number;
  aiTemperature: number;
  aiTimeoutMs: number;
  aiRetryAttempts: number;
  aiRetryDelayMs: number;
  aiMaxConcurrency: number;
  aiDailyRequestLimit: number;
  aiInputMaxTokens: number;
};

export default (): { worker: WorkerConfig } => ({
  worker: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    workerName: process.env.WORKER_NAME ?? 'reviewsha-worker',
    redisRequired: process.env.WORKER_REDIS_REQUIRED === 'true',
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 3),
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    databaseUrl:
      process.env.DATABASE_URL ??
      'postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public',
    minioEndpoint: process.env.MINIO_ENDPOINT ?? 'http://localhost:9000',
    minioAccessKey: process.env.MINIO_ACCESS_KEY ?? 'reviewsha',
    minioSecretKey: process.env.MINIO_SECRET_KEY ?? 'reviewsha-password',
    minioPort: Number(process.env.MINIO_PORT ?? 9000),
    minioUseSSL: process.env.MINIO_USE_SSL === 'true',
    aiProvider: process.env.AI_PROVIDER ?? 'deepseek',
    aiApiKey: process.env.OMNIROUTER_API_KEY,
    aiBaseUrl: process.env.OMNIROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    // OmniRoute's local gateway exposes the routing aliases rather than the
    // remote provider model ids. The old fallback caused every AI job to sit
    // at ANALYZE until the timeout with a 404 from OmniRoute.
    aiModel: process.env.AI_MODEL ?? 'auto/best-coding',
    aiMaxTokens: Number(process.env.AI_MAX_TOKENS ?? 4000),
    aiTemperature: Number(process.env.AI_TEMPERATURE ?? 0.2),
    aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 60000),
    aiRetryAttempts: Number(process.env.AI_RETRY_ATTEMPTS ?? 3),
    aiRetryDelayMs: Number(process.env.AI_RETRY_DELAY_MS ?? 1000),
    aiMaxConcurrency: Number(process.env.AI_MAX_CONCURRENCY ?? 3),
    aiDailyRequestLimit: Number(process.env.AI_DAILY_REQUEST_LIMIT ?? 500),
    aiInputMaxTokens: Number(process.env.AI_INPUT_MAX_TOKENS ?? 12000),
  },
});
