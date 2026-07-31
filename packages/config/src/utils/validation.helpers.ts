import { z } from 'zod';

export function parseWithSchema<TSchema extends z.ZodType>(
  schema: TSchema,
  value: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new Error(z.prettifyError(result.error));
  }

  return result.data;
}
