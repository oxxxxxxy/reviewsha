import type { Role } from '@prisma/client';

export interface ProjectAccessContext {
  readonly id: string;
  readonly role: Role;
}
