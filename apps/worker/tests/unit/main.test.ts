import { describe, expect, it } from 'vitest';

import { bootstrap } from '../../src/main';

describe('worker bootstrap', () => {
  it('exports bootstrap function', () => {
    expect(bootstrap).toBeInstanceOf(Function);
  });
});
