import { z } from 'zod';

const baseWorkerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  WORKER_NAME: z.string().min(1).default('reviewsha-worker'),
  WORKER_REDIS_REQUIRED: z.coerce.boolean().default(false),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(3),
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
  OMNIROUTER_API_KEY: z.string().optional(),
  OMNIROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  AI_MODEL: z.string().default('deepseek/deepseek-chat'),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(4000),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  AI_RETRY_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  AI_RETRY_DELAY_MS: z.coerce.number().int().positive().default(1000),
  AI_MAX_CONCURRENCY: z.coerce.number().int().positive().default(3),
  AI_DAILY_REQUEST_LIMIT: z.coerce.number().int().positive().default(500),
  AI_INPUT_MAX_TOKENS: z.coerce.number().int().positive().default(12000),
});

export const workerEnvSchema = baseWorkerEnvSchema.superRefine((value, context) => {
  if (value.NODE_ENV !== 'production') return;
  const unsafeDefaults = {
    DATABASE_URL: 'postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public',
    MINIO_ACCESS_KEY: 'reviewsha',
    MINIO_SECRET_KEY: 'reviewsha-password',
  } as const;
  for (const [field, unsafeValue] of Object.entries(unsafeDefaults)) {
    if (value[field as keyof typeof value] === unsafeValue) {
      context.addIssue({
        code: 'custom',
        path: [field],
        message: `${field} is required in production`,
      });
    }
  }
  if (!['mock', 'local'].includes(value.AI_PROVIDER) && !value.OMNIROUTER_API_KEY) {
    context.addIssue({
      code: 'custom',
      path: ['OMNIROUTER_API_KEY'],
      message: 'OMNIROUTER_API_KEY is required for remote AI providers in production',
    });
  }
});

export type WorkerEnvConfig = z.infer<typeof workerEnvSchema>;

export function validateWorkerEnv(config: Record<string, unknown>): WorkerEnvConfig {
  const parsed = workerEnvSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(`Invalid worker environment variables: ${z.prettifyError(parsed.error)}`);
  }

  return parsed.data;
}
