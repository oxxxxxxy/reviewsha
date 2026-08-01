import { createHash } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AIRequestStatus,
  FindingCategory,
  MessageRole,
  NotificationType,
  PrismaClient,
  ProjectRole,
  QueueStatus,
  QueueType,
  Role,
  ScanStatus,
  ScanStepStatus,
  ScanStepType,
  Severity,
} from '@prisma/client';

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public',
});
const prisma = new PrismaClient({ adapter });

function hashPassword(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

async function main(): Promise<void> {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@reviewsha.local' },
    update: {
      displayName: 'Reviewsha Admin',
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      email: 'admin@reviewsha.local',
      passwordHash: hashPassword('admin-password'),
      displayName: 'Reviewsha Admin',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@reviewsha.local' },
    update: {
      displayName: 'Demo User',
      isActive: true,
    },
    create: {
      email: 'user@reviewsha.local',
      passwordHash: hashPassword('user-password'),
      displayName: 'Demo User',
      role: Role.USER,
      isActive: true,
    },
  });

  await prisma.session.upsert({
    where: { refreshTokenHash: hashPassword('demo-session-refresh-token') },
    update: {
      revokedAt: null,
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
    },
    create: {
      userId: user.id,
      refreshTokenHash: hashPassword('demo-session-refresh-token'),
      device: 'Seed browser',
      ip: '127.0.0.1',
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
    },
  });

  await prisma.refreshToken.upsert({
    where: { tokenHash: hashPassword('demo-refresh-token') },
    update: {
      revokedAt: null,
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
    },
    create: {
      userId: user.id,
      tokenHash: hashPassword('demo-refresh-token'),
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: 'reviewsha-demo' },
    update: {
      ownerId: admin.id,
      name: 'Reviewsha Demo Organization',
    },
    create: {
      ownerId: admin.id,
      name: 'Reviewsha Demo Organization',
      slug: 'reviewsha-demo',
    },
  });

  await prisma.invitation.upsert({
    where: { tokenHash: hashPassword('demo-invitation-token') },
    update: {
      organizationId: organization.id,
      invitedById: admin.id,
      email: 'invitee@reviewsha.local',
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
    },
    create: {
      organizationId: organization.id,
      invitedById: admin.id,
      email: 'invitee@reviewsha.local',
      role: ProjectRole.VIEWER,
      tokenHash: hashPassword('demo-invitation-token'),
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
    },
  });

  const project = await prisma.project.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {
      ownerId: user.id,
      organizationId: organization.id,
      name: 'Demo Reviewsha Project',
      description: 'Seed project for local development and Prisma checks.',
      language: 'TypeScript',
    },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      ownerId: user.id,
      organizationId: organization.id,
      name: 'Demo Reviewsha Project',
      description: 'Seed project for local development and Prisma checks.',
      language: 'TypeScript',
    },
  });

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: user.id } },
    update: { role: ProjectRole.OWNER },
    create: { projectId: project.id, userId: user.id, role: ProjectRole.OWNER },
  });

  const uploadedFile = await prisma.uploadedFile.upsert({
    where: {
      bucket_objectKey: {
        bucket: 'projects',
        objectKey: `projects/${user.id}/${project.id}/uploads/demo.zip`,
      },
    },
    update: {
      uploadedById: user.id,
      filename: 'demo.zip',
      size: 1024n,
      mimeType: 'application/zip',
      checksum: 'demo-checksum',
    },
    create: {
      projectId: project.id,
      uploadedById: user.id,
      bucket: 'projects',
      objectKey: `projects/${user.id}/${project.id}/uploads/demo.zip`,
      filename: 'demo.zip',
      size: 1024n,
      mimeType: 'application/zip',
      checksum: 'demo-checksum',
    },
  });

  const scan = await prisma.scan.upsert({
    where: { id: '00000000-0000-4000-8000-000000000002' },
    update: {
      projectId: project.id,
      sourceFileId: uploadedFile.id,
      createdById: user.id,
      status: ScanStatus.COMPLETED,
      progress: 100,
      finishedAt: new Date('2026-08-01T00:10:00.000Z'),
    },
    create: {
      id: '00000000-0000-4000-8000-000000000002',
      projectId: project.id,
      sourceFileId: uploadedFile.id,
      createdById: user.id,
      status: ScanStatus.COMPLETED,
      progress: 100,
      startedAt: new Date('2026-08-01T00:00:00.000Z'),
      finishedAt: new Date('2026-08-01T00:10:00.000Z'),
    },
  });

  await prisma.scanStep.upsert({
    where: { scanId_type: { scanId: scan.id, type: ScanStepType.ANALYZE } },
    update: {
      status: ScanStepStatus.COMPLETED,
      completedAt: new Date('2026-08-01T00:09:00.000Z'),
    },
    create: {
      scanId: scan.id,
      type: ScanStepType.ANALYZE,
      status: ScanStepStatus.COMPLETED,
      startedAt: new Date('2026-08-01T00:05:00.000Z'),
      completedAt: new Date('2026-08-01T00:09:00.000Z'),
    },
  });

  const report = await prisma.report.upsert({
    where: { scanId: scan.id },
    update: {
      projectId: project.id,
      summary: 'Demo report generated by seed.',
      score: 82,
      tokensUsed: 1200,
      cost: '0.120000',
    },
    create: {
      scanId: scan.id,
      projectId: project.id,
      summary: 'Demo report generated by seed.',
      score: 82,
      tokensUsed: 1200,
      cost: '0.120000',
    },
  });

  const finding = await prisma.finding.upsert({
    where: { id: '00000000-0000-4000-8000-000000000003' },
    update: {
      scanId: scan.id,
      reportId: report.id,
      fileId: uploadedFile.id,
      severity: Severity.MEDIUM,
      category: FindingCategory.MAINTAINABILITY,
      title: 'Demo finding',
    },
    create: {
      id: '00000000-0000-4000-8000-000000000003',
      scanId: scan.id,
      reportId: report.id,
      fileId: uploadedFile.id,
      filePath: 'src/app.ts',
      line: 12,
      column: 3,
      severity: Severity.MEDIUM,
      category: FindingCategory.MAINTAINABILITY,
      title: 'Demo finding',
      description: 'Seeded AI finding for local checks.',
      recommendation: 'Use this row only as a development fixture.',
    },
  });

  await prisma.aIRequest.upsert({
    where: { id: '00000000-0000-4000-8000-000000000007' },
    update: {
      status: AIRequestStatus.COMPLETED,
      findingId: finding.id,
      completedAt: new Date('2026-08-01T00:09:00.000Z'),
    },
    create: {
      id: '00000000-0000-4000-8000-000000000007',
      scanId: scan.id,
      findingId: finding.id,
      userId: user.id,
      provider: 'deepseek',
      model: 'deepseek-chat',
      promptTokens: 900,
      completionTokens: 300,
      totalTokens: 1200,
      cost: '0.120000',
      status: AIRequestStatus.COMPLETED,
      completedAt: new Date('2026-08-01T00:09:00.000Z'),
    },
  });

  await prisma.notification.upsert({
    where: { id: '00000000-0000-4000-8000-000000000008' },
    update: {
      message: 'Demo report is ready.',
      read: false,
    },
    create: {
      id: '00000000-0000-4000-8000-000000000008',
      userId: user.id,
      type: NotificationType.REPORT_READY,
      message: 'Demo report is ready.',
    },
  });

  const chatSession = await prisma.chatSession.upsert({
    where: { id: '00000000-0000-4000-8000-000000000004' },
    update: {
      projectId: project.id,
      reportId: report.id,
      userId: user.id,
      title: 'Demo report chat',
    },
    create: {
      id: '00000000-0000-4000-8000-000000000004',
      projectId: project.id,
      reportId: report.id,
      userId: user.id,
      title: 'Demo report chat',
    },
  });

  await prisma.chatMessage.upsert({
    where: { id: '00000000-0000-4000-8000-000000000005' },
    update: {
      content: 'Explain the demo finding.',
    },
    create: {
      id: '00000000-0000-4000-8000-000000000005',
      sessionId: chatSession.id,
      userId: user.id,
      role: MessageRole.USER,
      content: 'Explain the demo finding.',
    },
  });

  await prisma.queueJob.upsert({
    where: { id: '00000000-0000-4000-8000-000000000006' },
    update: {
      status: QueueStatus.COMPLETED,
      attempts: 1,
      workerId: 'seed-worker',
    },
    create: {
      id: '00000000-0000-4000-8000-000000000006',
      projectId: project.id,
      scanId: scan.id,
      type: QueueType.SCAN,
      status: QueueStatus.COMPLETED,
      attempts: 1,
      workerId: 'seed-worker',
      payload: { source: 'seed' },
      startedAt: new Date('2026-08-01T00:00:00.000Z'),
      finishedAt: new Date('2026-08-01T00:10:00.000Z'),
    },
  });

  console.log(`Seed completed: admin=${admin.email}, user=${user.email}, project=${project.name}`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
