import { ADMIN_ROLES, AUTHENTICATED_ROLES } from '../roles/role.constants';
import type { AuthorizationPolicy } from '../interfaces/policy.interface';

export const AUTHORIZATION_POLICIES = {
  auth: {
    currentUser: {
      resource: 'auth',
      action: 'read',
      roles: AUTHENTICATED_ROLES,
      description: 'Authenticated USER or ADMIN can read own current-user profile.',
    },
    logout: {
      resource: 'auth',
      action: 'logout',
      roles: AUTHENTICATED_ROLES,
      description: 'Authenticated USER or ADMIN can revoke own session(s).',
    },
  },
  sessions: {
    readOwn: {
      resource: 'sessions',
      action: 'read',
      roles: AUTHENTICATED_ROLES,
      ownershipRequired: true,
      description: 'Authenticated USER or ADMIN can list own active sessions.',
    },
    revokeOwn: {
      resource: 'sessions',
      action: 'delete',
      roles: AUTHENTICATED_ROLES,
      ownershipRequired: true,
      description: 'Authenticated USER or ADMIN can revoke own sessions.',
    },
  },
  users: {
    manage: {
      resource: 'users',
      action: 'manage',
      roles: ADMIN_ROLES,
      description: 'ADMIN can manage users.',
    },
    read: {
      resource: 'users',
      action: 'read',
      roles: ADMIN_ROLES,
      description: 'ADMIN can read user records.',
    },
  },
  projects: {
    create: {
      resource: 'projects',
      action: 'create',
      roles: AUTHENTICATED_ROLES,
      description: 'USER or ADMIN can create projects.',
    },
    readOwnOrAdmin: {
      resource: 'projects',
      action: 'read',
      roles: AUTHENTICATED_ROLES,
      ownershipRequired: true,
      description: 'USER can read own projects; ADMIN can read any project.',
    },
    manageOwnOrAdmin: {
      resource: 'projects',
      action: 'manage',
      roles: AUTHENTICATED_ROLES,
      ownershipRequired: true,
      description: 'USER can manage own projects; ADMIN can manage any project.',
    },
  },
  scans: {
    createOwnOrAdmin: {
      resource: 'scans',
      action: 'create',
      roles: AUTHENTICATED_ROLES,
      ownershipRequired: true,
      description: 'USER can start scans for own projects; ADMIN can start scans for any project.',
    },
    readOwnOrAdmin: {
      resource: 'scans',
      action: 'read',
      roles: AUTHENTICATED_ROLES,
      ownershipRequired: true,
      description: 'USER can read scans for own projects; ADMIN can read any scan.',
    },
  },
  reports: {
    readOwnOrAdmin: {
      resource: 'reports',
      action: 'read',
      roles: AUTHENTICATED_ROLES,
      ownershipRequired: true,
      description: 'USER can read reports for own projects; ADMIN can read any report.',
    },
    exportOwnOrAdmin: {
      resource: 'reports',
      action: 'read',
      roles: AUTHENTICATED_ROLES,
      ownershipRequired: true,
      description: 'USER can export own reports; ADMIN can export any report.',
    },
  },
  admin: {
    accessPanel: {
      resource: 'admin',
      action: 'manage',
      roles: ADMIN_ROLES,
      description: 'ADMIN can access administrative APIs.',
    },
  },
} as const satisfies Record<string, Record<string, AuthorizationPolicy>>;
