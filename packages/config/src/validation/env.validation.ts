import { z } from 'zod';

export const sharedEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().min(1).optional(),
  REDIS_PORT: z.coerce.number().int().positive().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().nonnegative().optional(),
  MINIO_ENDPOINT: z.string().min(1).optional(),
  MINIO_ACCESS_KEY: z.string().min(1).optional(),
  MINIO_SECRET_KEY: z.string().min(1).optional(),
  AI_PROVIDER: z.enum(['deepseek', 'openai', 'local', 'mock']).optional(),
});

export type SharedEnv = z.infer<typeof sharedEnvSchema>;

export function validateSharedEnv(input: Record<string, unknown>): SharedEnv {
  const parsed = sharedEnvSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid shared environment: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
