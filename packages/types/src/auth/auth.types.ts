import type { ID, ISODateString } from '../common/utility.types.js';

export enum Role {
  User = 'USER',
  Admin = 'ADMIN',
  SuperAdmin = 'SUPER_ADMIN',
}

export interface User {
  id: ID;
  email: string;
  name?: string;
  role: Role;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
