import { z } from 'zod';
import { DEFAULT_URLS } from '@reviewsha/config';

export const adminEnvSchema = z.object({
  VITE_API_URL: z.url().default(DEFAULT_URLS.api),
});

export type AdminEnv = z.infer<typeof adminEnvSchema>;

export function validateAdminEnv(input: Record<string, unknown>): AdminEnv {
  return adminEnvSchema.parse(input);
}
