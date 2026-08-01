import { describe, expect, it } from 'vitest';

import { DatabaseModule } from '../../../src/database/database.module';
import { PrismaService } from '../../../src/database/prisma.service';

describe('DatabaseModule', () => {
  it('declares PrismaService as exported provider', () => {
    const metadata = Reflect.getMetadata('exports', DatabaseModule) as unknown[];

    expect(metadata).toContain(PrismaService);
  });

  it('is marked as a global module', () => {
    expect(Reflect.getMetadata('__module:global__', DatabaseModule)).toBe(true);
  });
});
