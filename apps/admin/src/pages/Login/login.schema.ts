import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z.email('Введите корректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
});

export type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;
