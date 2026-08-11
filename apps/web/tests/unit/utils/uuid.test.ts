import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUuid } from '../../../src/utils/uuid';

describe('createUuid', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses native randomUUID when the browser exposes it', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'native-uuid' });

    expect(createUuid()).toBe('native-uuid');
  });

  it('generates a UUID v4 fallback on an insecure origin', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0);
        return bytes;
      },
    });

    expect(createUuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
  });
});
