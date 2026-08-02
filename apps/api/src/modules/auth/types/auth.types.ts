import type { Role } from '@prisma/client';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: Role;
  type: 'access';
  jti: string;
}

export interface JwtRefreshPayload {
  sub: string;
  email: string;
  role: Role;
  type: 'refresh';
  jti: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

export interface AuthenticatedRefreshUser extends AuthenticatedUser {
  refreshToken: string;
}
