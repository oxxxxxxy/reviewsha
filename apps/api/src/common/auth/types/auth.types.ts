import type { Role } from '@prisma/client';
import type { AccessTokenPayload } from '../../../modules/auth/interfaces/access-token.interface';
import type { RefreshTokenPayload } from '../../../modules/auth/interfaces/refresh-token.interface';

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
