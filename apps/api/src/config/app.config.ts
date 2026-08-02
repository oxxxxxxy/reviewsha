import { API_BASE_PATH, DEFAULT_URLS } from '@reviewsha/config';

export type AppConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
};

export type JwtConfig = {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
  issuer: string;
  audience: string;
};

export default (): {
  app: AppConfig;
  database: { url: string; logQueries: boolean };
  jwt: JwtConfig;
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
  jwt: {
    secret: process.env.JWT_SECRET ?? 'reviewsha-access-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'reviewsha-refresh-secret-change-me',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
    issuer: process.env.JWT_ISSUER ?? 'reviewsha-api',
    audience: process.env.JWT_AUDIENCE ?? 'reviewsha-clients',
  },
});
