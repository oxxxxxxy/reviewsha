import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { AdminController } from '../../../../src/modules/admin/admin.controller';
import { ROLES_KEY } from '../../../../src/common/auth/constants/auth.constants';
import { RolesGuard } from '../../../../src/common/auth/guards/roles.guard';

const adminRoutes = [
  'overview',
  'userDetails',
  'projectDetails',
  'queues',
  'aiUsage',
  'aiUsageBreakdown',
  'statistics',
  'logs',
  'log',
  'jobs',
  'job',
  'retry',
  'remove',
] as const;

function context(handler: () => unknown, role: Role) {
  return {
    getHandler: () => handler,
    getClass: () => AdminController,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 'user-1', role } }) }),
  } as never;
}

describe('AdminController', () => {
  it('requires the ADMIN role on every administrative route', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminController);
    expect(roles).toEqual(['ADMIN']);
    for (const route of adminRoutes) {
      expect(typeof AdminController.prototype[route]).toBe('function');
    }
  });

  it('denies USER and allows ADMIN for every administrative route', () => {
    const guard = new RolesGuard(new Reflector(), {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as never);

    for (const route of adminRoutes) {
      const handler = AdminController.prototype[route] as () => unknown;
      expect(() => guard.canActivate(context(handler, Role.USER))).toThrow('Insufficient role');
      expect(guard.canActivate(context(handler, Role.ADMIN))).toBe(true);
    }
  });
});
