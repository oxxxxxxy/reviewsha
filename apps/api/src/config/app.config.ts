import { API_BASE_PATH, DEFAULT_URLS } from '@reviewsha/config';
import { createJwtConfig, type JwtConfig } from './jwt.config';

export type AppConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
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
});
