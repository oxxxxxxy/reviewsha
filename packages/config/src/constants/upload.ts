export const UPLOAD_LIMITS = {
  maxArchiveSizeBytes: 50 * 1024 * 1024,
  maxFilesInsideArchive: 5_000,
  allowedExtensions: ['.zip'],
  blockedDirectories: ['node_modules', '.git', 'dist', 'build', 'coverage'],
} as const;
