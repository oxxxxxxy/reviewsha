import { describe, expect, it } from 'vitest';
import { AdminController } from '../../../../src/modules/admin/admin.controller';
import { ROLES_KEY } from '../../../../src/common/auth/constants/auth.constants';

describe('AdminController', () => {
  it('requires the ADMIN role on every administrative route', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminController);
    expect(roles).toEqual(['ADMIN']);
  });
});
