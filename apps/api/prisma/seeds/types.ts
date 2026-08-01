import type { PrismaClient, Report, UploadedFile, User } from '@prisma/client';

export interface SeedContext {
  prisma: PrismaClient;
  usersByEmail: Map<string, User>;
  uploadedFilesByObjectKey: Map<string, UploadedFile>;
  reportsByScanId: Map<string, Report>;
}

export interface SeedResult {
  users: number;
  projects: number;
  uploadedFiles: number;
  scans: number;
  reports: number;
  findings: number;
  chatMessages: number;
  queueJobs: number;
}
