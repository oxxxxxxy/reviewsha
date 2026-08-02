import type { AppRole } from '../roles/role.constants';

export type AuthorizationResource =
  'auth' | 'sessions' | 'users' | 'projects' | 'scans' | 'reports' | 'admin';

export type AuthorizationAction =
  'read' | 'create' | 'update' | 'delete' | 'manage' | 'refresh' | 'logout';

export interface AuthorizationPolicy {
  resource: AuthorizationResource;
  action: AuthorizationAction;
  roles: readonly AppRole[];
  ownershipRequired?: boolean;
  description: string;
}
