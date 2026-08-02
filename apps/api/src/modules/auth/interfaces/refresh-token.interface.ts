import type { Role } from '@prisma/client';

export interface RefreshTokenPayload {
  sub: string;
  email: string;
  role: Role;
  type: 'refresh';
  jti: string;
  iss?: string;
  aud?: string | string[];
  iat?: number;
  exp?: number;
}
