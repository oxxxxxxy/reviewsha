import { API_BASE_PATH, DEFAULT_URLS } from '@reviewsha/config';
import { createJwtConfig, type JwtConfig } from './jwt.config';

export type AppConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
};

export default (): {
  app: AppConfig;
  database: { url: string; logQueries: boolean };
  jwt: JwtConfig;
  sessions: { maxSessionsPerUser: number };
  security: { internalApiKey: string };
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
});
