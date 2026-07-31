import { z } from 'zod';
import { DEFAULT_URLS } from '@reviewsha/config';

export const webEnvSchema = z.object({
  VITE_API_URL: z.url().default(DEFAULT_URLS.api),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export function validateWebEnv(input: Record<string, unknown>): WebEnv {
  return webEnvSchema.parse(input);
}
