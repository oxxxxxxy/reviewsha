export const ROLES = {
  user: 'USER',
  admin: 'ADMIN',
  owner: 'OWNER',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
