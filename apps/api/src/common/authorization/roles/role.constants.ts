import { Role } from '@prisma/client';

export const APP_ROLES = {
  USER: Role.USER,
  ADMIN: Role.ADMIN,
} as const;

export type AppRole = Role;

export const AUTHENTICATED_ROLES = [APP_ROLES.USER, APP_ROLES.ADMIN] as const;
export const ADMIN_ROLES = [APP_ROLES.ADMIN] as const;
