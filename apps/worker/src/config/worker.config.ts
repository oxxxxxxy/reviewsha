export type WorkerConfig = {
  nodeEnv: string;
  workerName: string;
  redisRequired: boolean;
  redisUrl: string;
  databaseUrl: string;
  minioEndpoint: string;
  minioAccessKey: string;
  minioSecretKey: string;
  aiProvider: string;
};

export default (): { worker: WorkerConfig } => ({
  worker: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    workerName: process.env.WORKER_NAME ?? 'reviewsha-worker',
    redisRequired: process.env.WORKER_REDIS_REQUIRED === 'true',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    databaseUrl:
      process.env.DATABASE_URL ??
      'postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public',
    minioEndpoint: process.env.MINIO_ENDPOINT ?? 'http://localhost:9000',
    minioAccessKey: process.env.MINIO_ACCESS_KEY ?? 'reviewsha',
    minioSecretKey: process.env.MINIO_SECRET_KEY ?? 'reviewsha-password',
    aiProvider: process.env.AI_PROVIDER ?? 'deepseek',
  },
});
