import { z } from 'zod';
import { API_BASE_PATH } from '@reviewsha/config';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default(API_BASE_PATH),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z
    .string()
    .default('postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public'),
  PRISMA_LOG_QUERIES: z.coerce.boolean().default(false),
  JWT_SECRET: z.string().default('reviewsha-access-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().default('reviewsha-refresh-secret-change-me'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  JWT_ISSUER: z.string().default('reviewsha-api'),
  JWT_AUDIENCE: z.string().default('reviewsha-clients'),
  MAX_SESSIONS_PER_USER: z.coerce.number().int().positive().default(10),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${z.prettifyError(parsed.error)}`);
  }

  return parsed.data;
}
