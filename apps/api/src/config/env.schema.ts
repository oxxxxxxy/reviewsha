import { z } from 'zod';
import { API_BASE_PATH } from '@reviewsha/config';

const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default(API_BASE_PATH),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:5174'),
  DATABASE_URL: z
    .string()
    .default('postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public'),
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().nonnegative().default(0),
  PRISMA_LOG_QUERIES: z.coerce.boolean().default(false),
  JWT_SECRET: z.string().default('reviewsha-access-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().default('reviewsha-refresh-secret-change-me'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  JWT_ISSUER: z.string().default('reviewsha-api'),
  JWT_AUDIENCE: z.string().default('reviewsha-clients'),
  JWT_ALGORITHM: z.enum(['HS256', 'RS256', 'ES256']).default('HS256'),
  MAX_SESSIONS_PER_USER: z.coerce.number().int().positive().default(10),
  INTERNAL_API_KEY: z.string().default('reviewsha-internal-api-key-change-me'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_ACCESS_KEY: z.string().default('reviewsha'),
  MINIO_SECRET_KEY: z.string().default('reviewsha-password'),
  MINIO_BUCKET_PROJECTS: z.string().default('projects'),
  MINIO_BUCKET_REPORTS: z.string().default('reports'),
  MINIO_BUCKET_TEMP: z.string().default('temp'),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  CHAT_MESSAGE_MAX_LENGTH: z.coerce.number().int().positive().default(4000),
  CHAT_CONTEXT_MAX_TOKENS: z.coerce.number().int().positive().default(8000),
  CHAT_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  CHAT_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(100),
  CHAT_CONTEXT_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  GITHUB_TOKEN: z.string().min(1).optional(),
});

const unsafeProductionDefaults: Partial<Record<keyof z.infer<typeof apiEnvSchema>, unknown>> = {
  DATABASE_URL: 'postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public',
  JWT_SECRET: 'reviewsha-access-secret-change-me',
  JWT_REFRESH_SECRET: 'reviewsha-refresh-secret-change-me',
  INTERNAL_API_KEY: 'reviewsha-internal-api-key-change-me',
  MINIO_ACCESS_KEY: 'reviewsha',
  MINIO_SECRET_KEY: 'reviewsha-password',
};

export const envSchema = apiEnvSchema.superRefine((value, context) => {
  if (value.NODE_ENV !== 'production') return;
  for (const [field, unsafeValue] of Object.entries(unsafeProductionDefaults)) {
    if (value[field as keyof typeof value] === unsafeValue) {
      context.addIssue({
        code: 'custom',
        path: [field],
        message: `${field} must be explicitly configured for production`,
      });
    }
  }
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${z.prettifyError(parsed.error)}`);
  }

  return parsed.data;
}
