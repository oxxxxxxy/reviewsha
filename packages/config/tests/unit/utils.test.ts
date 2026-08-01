import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  addSeconds,
  calculateExponentialBackoff,
  createLogEntry,
  formatLogEntry,
  isAllowedUploadFileName,
  isBlockedPath,
  isUuid,
  parseWithSchema,
} from '../../src/index.js';

describe('shared infrastructure helpers', () => {
  it('formats log entries in one project-wide format', () => {
    const entry = createLogEntry({
      timestamp: '2026-08-01T18:24:15.000Z',
      service: 'API',
      level: 'INFO',
      context: 'AuthService',
      message: 'User created',
    });

    expect(formatLogEntry(entry)).toBe(
      '[2026-08-01T18:24:15.000Z] API INFO AuthService User created',
    );
  });

  it('validates UUID values', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isUuid('not-uuid')).toBe(false);
  });

  it('checks upload file names and blocked paths', () => {
    expect(isAllowedUploadFileName('source.zip')).toBe(true);
    expect(isAllowedUploadFileName('source.tar')).toBe(false);
    expect(isBlockedPath('project/node_modules/package.json')).toBe(true);
  });

  it('calculates exponential backoff with cap', () => {
    expect(calculateExponentialBackoff({ attempt: 1 })).toBe(1000);
    expect(calculateExponentialBackoff({ attempt: 10, maxDelayMs: 5000 })).toBe(5000);
  });

  it('provides date and validation helpers', () => {
    expect(addSeconds(new Date('2026-08-01T00:00:00.000Z'), 5).toISOString()).toBe(
      '2026-08-01T00:00:05.000Z',
    );
    expect(parseWithSchema(z.object({ ok: z.boolean() }), { ok: true })).toEqual({ ok: true });
  });
});
