import { z } from 'zod';

export const workerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  WORKER_NAME: z.string().min(1).default('reviewsha-worker'),
  WORKER_REDIS_REQUIRED: z.coerce.boolean().default(false),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public'),
  MINIO_ENDPOINT: z.string().min(1).default('http://localhost:9000'),
  MINIO_ACCESS_KEY: z.string().min(1).default('reviewsha'),
  MINIO_SECRET_KEY: z.string().min(1).default('reviewsha-password'),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  AI_PROVIDER: z.enum(['deepseek', 'openai', 'local', 'mock']).default('deepseek'),
});

export type WorkerEnvConfig = z.infer<typeof workerEnvSchema>;

export function validateWorkerEnv(config: Record<string, unknown>): WorkerEnvConfig {
  const parsed = workerEnvSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(`Invalid worker environment variables: ${z.prettifyError(parsed.error)}`);
  }

  return parsed.data;
}
