export const PERMISSIONS = {
  projectsRead: 'projects:read',
  projectsWrite: 'projects:write',
  reportsRead: 'reports:read',
  reportsExport: 'reports:export',
  queuesRead: 'queues:read',
  usersManage: 'users:manage',
  systemAdmin: 'system:admin',
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
