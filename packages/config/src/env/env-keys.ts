export const ENV_KEYS = {
  nodeEnv: 'NODE_ENV',
  apiUrl: 'VITE_API_URL',
  databaseUrl: 'DATABASE_URL',
  redisUrl: 'REDIS_URL',
  redisHost: 'REDIS_HOST',
  redisPort: 'REDIS_PORT',
  redisPassword: 'REDIS_PASSWORD',
  redisDb: 'REDIS_DB',
  minioEndpoint: 'MINIO_ENDPOINT',
  minioAccessKey: 'MINIO_ACCESS_KEY',
  minioSecretKey: 'MINIO_SECRET_KEY',
  aiProvider: 'AI_PROVIDER',
  jwtSecret: 'JWT_SECRET',
} as const;

export type EnvKey = (typeof ENV_KEYS)[keyof typeof ENV_KEYS];
