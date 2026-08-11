import { describe, expect, it } from 'vitest';
import { validateWebEnv } from '../../../src/config/env.schema';

describe('web env schema', () => {
  it('uses shared API URL default', () => {
    expect(validateWebEnv({})).toEqual({ VITE_API_URL: '/api/v1' });
  });

  it('validates VITE_API_URL', () => {
    expect(() => validateWebEnv({ VITE_API_URL: 'not-url' })).toThrow();
  });
});
