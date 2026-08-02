import type { Role } from '@prisma/client';
import type { AccessTokenPayload } from '../interfaces/access-token.interface';
import type { RefreshTokenPayload } from '../interfaces/refresh-token.interface';

export type JwtAccessPayload = AccessTokenPayload;
export type JwtRefreshPayload = RefreshTokenPayload;

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  jti?: string;
}

export interface AuthenticatedRefreshUser extends AuthenticatedUser {
  refreshToken: string;
}
