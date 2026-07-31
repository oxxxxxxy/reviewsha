import { describe, expect, it } from 'vitest';

import { bootstrap } from './main';

describe('worker bootstrap', () => {
  it('exports bootstrap function', () => {
    expect(bootstrap).toBeInstanceOf(Function);
  });
});
