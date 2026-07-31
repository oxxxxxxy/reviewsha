export const STORAGE_BUCKETS = {
  projects: 'projects',
  reports: 'reports',
  temp: 'temp',
  exports: 'exports',
  avatars: 'avatars',
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
