import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import {
  AUTHORIZATION_POLICIES,
  APP_ROLES,
  FUTURE_PERMISSIONS,
} from '../../../../src/common/authorization';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../../../../src/common/auth/constants/auth.constants';
import { AuthController } from '../../../../src/modules/auth/controllers/auth.controller';
import { SessionsController } from '../../../../src/modules/sessions/controllers/sessions.controller';
import { UsersController } from '../../../../src/modules/users/controllers/users.controller';
import { HealthController } from '../../../../src/health/health.controller';
import { ProjectsController } from '../../../../src/modules/projects/controllers/projects.controller';

type ControllerClass = {
  readonly prototype: object;
};

function methodMetadata(controller: ControllerClass, methodName: string, key: string): unknown {
  const target = Reflect.get(controller.prototype, methodName);

  if (typeof target !== 'function') {
    throw new Error(`Controller method ${methodName} was not found`);
  }

  return Reflect.getMetadata(key, target);
}

function classMetadata(controller: object, key: string): unknown {
  return Reflect.getMetadata(key, controller);
}

describe('authorization policies', () => {
  it('defines central app role constants from Prisma Role enum', () => {
    expect(APP_ROLES.USER).toBe(Role.USER);
    expect(APP_ROLES.ADMIN).toBe(Role.ADMIN);
  });

  it('defines admin-only users policy', () => {
    expect(AUTHORIZATION_POLICIES.users.manage.roles).toEqual([Role.ADMIN]);
  });

  it('defines authenticated sessions policy', () => {
    expect(AUTHORIZATION_POLICIES.sessions.readOwn.roles).toEqual([Role.USER, Role.ADMIN]);
    expect(AUTHORIZATION_POLICIES.sessions.readOwn.ownershipRequired).toBe(true);
  });

  it('defines future domain policies with ownership metadata', () => {
    expect(AUTHORIZATION_POLICIES.projects.manageOwnOrAdmin.ownershipRequired).toBe(true);
    expect(AUTHORIZATION_POLICIES.scans.createOwnOrAdmin.roles).toEqual([Role.USER, Role.ADMIN]);
    expect(AUTHORIZATION_POLICIES.reports.readOwnOrAdmin.ownershipRequired).toBe(true);
  });

  it('prepares future permission constants', () => {
    expect(FUTURE_PERMISSIONS.PROJECTS_READ).toBe('projects.read');
    expect(FUTURE_PERMISSIONS.USERS_MANAGE).toBe('users.manage');
  });

  it('marks public auth endpoints explicitly', () => {
    expect(methodMetadata(AuthController, 'register', IS_PUBLIC_KEY)).toBe(true);
    expect(methodMetadata(AuthController, 'login', IS_PUBLIC_KEY)).toBe(true);
    expect(methodMetadata(AuthController, 'refresh', IS_PUBLIC_KEY)).toBe(true);
  });

  it('marks health endpoint public explicitly', () => {
    expect(methodMetadata(HealthController, 'getHealth', IS_PUBLIC_KEY)).toBe(true);
  });

  it('marks protected auth endpoints with roles', () => {
    expect(methodMetadata(AuthController, 'logout', ROLES_KEY)).toEqual([Role.USER, Role.ADMIN]);
    expect(methodMetadata(AuthController, 'logoutAll', ROLES_KEY)).toEqual([Role.USER, Role.ADMIN]);
    expect(methodMetadata(AuthController, 'me', ROLES_KEY)).toEqual([Role.USER, Role.ADMIN]);
  });

  it('marks sessions endpoints with roles', () => {
    expect(methodMetadata(SessionsController, 'list', ROLES_KEY)).toEqual([Role.USER, Role.ADMIN]);
    expect(methodMetadata(SessionsController, 'revoke', ROLES_KEY)).toEqual([
      Role.USER,
      Role.ADMIN,
    ]);
  });

  it('marks users controller as admin-only', () => {
    expect(classMetadata(UsersController, ROLES_KEY)).toEqual([Role.ADMIN]);
  });

  it('marks project endpoints as authenticated and ownership-aware', () => {
    expect(classMetadata(ProjectsController, ROLES_KEY)).toEqual([Role.USER, Role.ADMIN]);
    expect(AUTHORIZATION_POLICIES.projects.manageOwnOrAdmin.ownershipRequired).toBe(true);
  });
});
