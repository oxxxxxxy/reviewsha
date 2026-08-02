import type { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
  type: 'access';
  jti: string;
  iss?: string;
  aud?: string | string[];
  iat?: number;
  exp?: number;
}
