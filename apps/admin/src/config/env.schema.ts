import { z } from 'zod';

export const adminEnvSchema = z.object({
  VITE_API_URL: z.union([z.url(), z.string().startsWith('/')]).default('/api/v1'),
});

export type AdminEnv = z.infer<typeof adminEnvSchema>;

export function validateAdminEnv(input: Record<string, unknown>): AdminEnv {
  return adminEnvSchema.parse(input);
}
