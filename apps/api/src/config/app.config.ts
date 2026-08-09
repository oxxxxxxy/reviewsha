import { API_BASE_PATH, DEFAULT_URLS } from '@reviewsha/config';
import { createJwtConfig, type JwtConfig } from './jwt.config';

export type AppConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
};

export type RedisConfig = {
  url: string;
  host: string;
  port: number;
  password?: string;
  db: number;
};

export type MinioConfig = {
  endpoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  useSSL: boolean;
  buckets: { projects: string; reports: string; temp: string };
};

export default (): {
  app: AppConfig;
  database: { url: string; logQueries: boolean };
  redis: RedisConfig;
  jwt: JwtConfig;
  sessions: { maxSessionsPerUser: number };
  security: { internalApiKey: string };
  minio: {
    endpoint: string;
    port: number;
    accessKey: string;
    secretKey: string;
    useSSL: boolean;
    buckets: { projects: string; reports: string; temp: string };
  };
  chat: {
    messageMaxLength: number;
    contextMaxTokens: number;
    requestTimeoutMs: number;
    pollIntervalMs: number;
    contextCacheTtlSeconds: number;
  };
} => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    host: process.env.API_HOST ?? '0.0.0.0',
    port: Number(process.env.API_PORT ?? 3000),
    apiPrefix: process.env.API_PREFIX ?? API_BASE_PATH,
    corsOrigin: process.env.CORS_ORIGIN ?? DEFAULT_URLS.web,
  },
  database: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public',
    logQueries: process.env.PRISMA_LOG_QUERIES === 'true',
  },
  redis: {
    url:
      process.env.REDIS_URL ??
      `redis://${process.env.REDIS_HOST ?? 'localhost'}:${Number(process.env.REDIS_PORT ?? 6379)}`,
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB ?? 0),
  },
  jwt: createJwtConfig(process.env),
  sessions: {
    maxSessionsPerUser: Number(process.env.MAX_SESSIONS_PER_USER ?? 10),
  },
  security: {
    internalApiKey: process.env.INTERNAL_API_KEY ?? 'reviewsha-internal-api-key-change-me',
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: Number(process.env.MINIO_PORT ?? 9000),
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'reviewsha',
    secretKey: process.env.MINIO_SECRET_KEY ?? 'reviewsha-password',
    useSSL: process.env.MINIO_USE_SSL === 'true',
    buckets: {
      projects: process.env.MINIO_BUCKET_PROJECTS ?? 'projects',
      reports: process.env.MINIO_BUCKET_REPORTS ?? 'reports',
      temp: process.env.MINIO_BUCKET_TEMP ?? 'temp',
    },
  },
  chat: {
    messageMaxLength: Number(process.env.CHAT_MESSAGE_MAX_LENGTH ?? 4000),
    contextMaxTokens: Number(process.env.CHAT_CONTEXT_MAX_TOKENS ?? 8000),
    requestTimeoutMs: Number(process.env.CHAT_REQUEST_TIMEOUT_MS ?? 60000),
    pollIntervalMs: Number(process.env.CHAT_POLL_INTERVAL_MS ?? 100),
    contextCacheTtlSeconds: Number(process.env.CHAT_CONTEXT_CACHE_TTL_SECONDS ?? 900),
  },
});
