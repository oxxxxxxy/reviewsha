import { describe, expect, it } from 'vitest';

import { adminLoginSchema } from '../../../../src/pages/Login/login.schema';

describe('adminLoginSchema', () => {
  it('accepts valid admin credentials shape', () => {
    const result = adminLoginSchema.safeParse({
      email: 'admin@example.com',
      password: 'strong-password',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = adminLoginSchema.safeParse({
      email: 'invalid-email',
      password: 'strong-password',
    });

    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = adminLoginSchema.safeParse({
      email: 'admin@example.com',
      password: 'short',
    });

    expect(result.success).toBe(false);
  });
});
