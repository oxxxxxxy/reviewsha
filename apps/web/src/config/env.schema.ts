import { z } from 'zod';

export const webEnvSchema = z.object({
  // Production is served behind the same ingress as the API. A relative URL
  // avoids baking localhost:3000 into the static bundle.
  VITE_API_URL: z
    .union([z.url(), z.string().regex(/^\/[^\s]*$/, 'must be an absolute URL or a relative path')])
    .default('/api/v1'),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export function validateWebEnv(input: Record<string, unknown>): WebEnv {
  return webEnvSchema.parse(input);
}
