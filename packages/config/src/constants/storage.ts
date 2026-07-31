export const STORAGE_BUCKETS = {
  uploads: 'uploads',
  reports: 'reports',
  artifacts: 'artifacts',
  projects: 'projects',
  temp: 'temp',
  exports: 'exports',
  avatars: 'avatars',
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
