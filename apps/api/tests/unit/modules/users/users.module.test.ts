import { describe, expect, it } from 'vitest';
import { UsersModule } from '../../../../src/modules/users/users.module';
import { UsersService } from '../../../../src/modules/users/services/users.service';

describe('UsersModule', () => {
  it('is defined and exports UsersService', () => {
    const exportsMetadata = Reflect.getMetadata('exports', UsersModule) as unknown[];

    expect(UsersModule).toBeDefined();
    expect(exportsMetadata).toContain(UsersService);
  });
});
