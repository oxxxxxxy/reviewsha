import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const prismaDir = join(process.cwd(), 'prisma');
const schemaPath = join(prismaDir, 'schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

describe('Prisma schema contract', () => {
  it('declares PostgreSQL datasource and Prisma Client generator', () => {
    expect(schema).toContain('provider = "postgresql"');
    expect(schema).toContain('provider = "prisma-client-js"');
  });

  it('declares all Stage 3.1 domain models', () => {
    for (const model of [
      'User',
      'Session',
      'Organization',
      'Project',
      'ProjectMember',
      'UploadedFile',
      'Scan',
      'ScanStep',
      'Report',
      'Finding',
      'AIRequest',
      'ChatSession',
      'ChatMessage',
      'Notification',
      'Invitation',
      'QueueJob',
      'RefreshToken',
    ]) {
      expect(schema).toContain(`model ${model} {`);
    }
  });

  it('declares all required enums', () => {
    for (const enumName of [
      'Role',
      'ProjectRole',
      'ProjectStatus',
      'Visibility',
      'ScanStatus',
      'ScanStepType',
      'ScanStepStatus',
      'Severity',
      'FindingCategory',
      'FindingStatus',
      'ReportFormat',
      'AIRequestStatus',
      'QueueStatus',
      'QueueType',
      'MessageRole',
      'NotificationType',
      'InvitationStatus',
    ]) {
      expect(schema).toContain(`enum ${enumName} {`);
    }
  });

  it('keeps required indexes and unique constraints', () => {
    expect(schema).toMatch(/email\s+String\s+@unique/);
    expect(schema).toMatch(/scanId\s+String\s+@unique/);
    expect(schema).toContain('@@index([ownerId])');
    expect(schema).toContain('@@index([projectId])');
    expect(schema).toContain('@@index([reportId])');
    expect(schema).toContain('@@index([status])');
  });

  it('defines explicit foreign key delete policies', () => {
    expect(schema).toContain('onDelete: Cascade');
    expect(schema).toContain('onDelete: SetNull');
    expect(schema).toContain('onUpdate: Cascade');
  });

  it('contains an initial migration and seed file', () => {
    expect(existsSync(join(prismaDir, 'migrations'))).toBe(true);
    expect(existsSync(join(prismaDir, 'seed.ts'))).toBe(true);
  });
});
