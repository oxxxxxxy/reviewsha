import { describe, expect, it } from 'vitest';
import { validateAdminEnv } from './env.schema';

describe('admin env schema', () => {
  it('uses shared API URL default', () => {
    expect(validateAdminEnv({})).toEqual({ VITE_API_URL: 'http://localhost:3000/api' });
  });

  it('validates VITE_API_URL', () => {
    expect(() => validateAdminEnv({ VITE_API_URL: 'not-url' })).toThrow();
  });
});
