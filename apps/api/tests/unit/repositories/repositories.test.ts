import { describe, expect, it, vi, type Mock } from 'vitest';
import { FindingCategory, MessageRole, QueueStatus, ScanStatus, Severity } from '@prisma/client';
import { PrismaService } from '../../../src/database/prisma.service';
import {
  BaseRepository,
  type BaseDelegate,
  type PrismaRepositoryClient,
} from '../../../src/repositories/base/base.repository';
import { ChatMessageRepository } from '../../../src/repositories/chat/chat-message.repository';
import { ChatSessionRepository } from '../../../src/repositories/chat/chat-session.repository';
import { FindingRepository } from '../../../src/repositories/finding/finding.repository';
import { ProjectRepository } from '../../../src/repositories/project/project.repository';
import { QueueJobRepository } from '../../../src/repositories/queue/queue-job.repository';
import { RefreshTokenRepository } from '../../../src/repositories/auth/refresh-token.repository';
import { ReportRepository } from '../../../src/repositories/report/report.repository';
import { ScanRepository } from '../../../src/repositories/scan/scan.repository';
import { UploadedFileRepository } from '../../../src/repositories/upload/uploaded-file.repository';
import { UserRepository } from '../../../src/repositories/user/user.repository';
import { RepositoriesModule, REPOSITORY_PROVIDERS } from '../../../src/repositories';

interface DelegateMock extends BaseDelegate<unknown> {
  findMany: Mock;
  findUnique: Mock;
  findFirst: Mock;
  count: Mock;
  delete: Mock;
  create: Mock;
  update: Mock;
  updateMany: Mock;
  deleteMany: Mock;
  createMany: Mock;
}

interface PrismaMock {
  user: DelegateMock;
  project: DelegateMock;
  scan: DelegateMock;
  report: DelegateMock;
  finding: DelegateMock;
  uploadedFile: DelegateMock;
  refreshToken: DelegateMock;
  queueJob: DelegateMock;
  chatSession: DelegateMock;
  chatMessage: DelegateMock;
  projectTag: DelegateMock;
  projectHistory: DelegateMock;
  aIRequest: DelegateMock;
  aIUsage: DelegateMock;
  $transaction: Mock;
}

class TestRepository extends BaseRepository<unknown> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(client: PrismaRepositoryClient): BaseDelegate<unknown> {
    return (client as unknown as PrismaMock).user;
  }
}

function createDelegate(): DelegateMock {
  return {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  };
}

function createPrismaMock(): PrismaMock {
  return {
    user: createDelegate(),
    project: createDelegate(),
    scan: createDelegate(),
    report: createDelegate(),
    finding: createDelegate(),
    uploadedFile: createDelegate(),
    refreshToken: createDelegate(),
    queueJob: createDelegate(),
    chatSession: createDelegate(),
    chatMessage: createDelegate(),
    projectTag: createDelegate(),
    projectHistory: createDelegate(),
    aIRequest: createDelegate(),
    aIUsage: createDelegate(),
    $transaction: vi.fn(),
  } as unknown as PrismaMock;
}

function asPrismaService(prisma: PrismaMock): PrismaService {
  return prisma as unknown as PrismaService;
}

describe('RepositoryModule', () => {
  it('registers all repository providers', () => {
    expect(REPOSITORY_PROVIDERS).toHaveLength(10);
    expect(Reflect.getMetadata('__module:global__', RepositoriesModule)).toBe(true);
  });
});

describe('BaseRepository', () => {
  it('finds a record by id', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ id: 'user-id' });

    await expect(new TestRepository(asPrismaService(prisma)).findById('user-id')).resolves.toEqual({
      id: 'user-id',
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-id' } });
  });

  it('checks that a record exists', async () => {
    const prisma = createPrismaMock();
    prisma.user.count.mockResolvedValue(1);

    await expect(new TestRepository(asPrismaService(prisma)).exists('user-id')).resolves.toBe(true);
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { id: 'user-id' } });
  });

  it('returns false when a record does not exist', async () => {
    const prisma = createPrismaMock();
    prisma.user.count.mockResolvedValue(0);

    await expect(new TestRepository(asPrismaService(prisma)).exists('missing-id')).resolves.toBe(
      false,
    );
  });

  it('counts records', async () => {
    const prisma = createPrismaMock();
    prisma.user.count.mockResolvedValue(3);

    await expect(new TestRepository(asPrismaService(prisma)).count()).resolves.toBe(3);
    expect(prisma.user.count).toHaveBeenCalledWith();
  });

  it('deletes a record by id', async () => {
    const prisma = createPrismaMock();
    prisma.user.delete.mockResolvedValue({ id: 'user-id' });

    await expect(
      new TestRepository(asPrismaService(prisma)).deleteById('user-id'),
    ).resolves.toEqual({
      id: 'user-id',
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-id' } });
  });

  it('executes multiple operations inside a transaction', async () => {
    const prisma = createPrismaMock();
    const tx = { user: createDelegate() };
    prisma.$transaction.mockImplementation((handler: (client: typeof tx) => Promise<string>) =>
      handler(tx),
    );

    await expect(
      new TestRepository(asPrismaService(prisma)).transaction(async () => 'done'),
    ).resolves.toBe('done');
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });
});

describe('UserRepository', () => {
  it('finds a user by email', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ email: 'developer@reviewsha.local' });

    await new UserRepository(asPrismaService(prisma)).findByEmail('developer@reviewsha.local');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'developer@reviewsha.local' },
    });
  });

  it('creates a user', async () => {
    const prisma = createPrismaMock();
    const data = { email: 'new@reviewsha.local', passwordHash: 'sha256:test', displayName: 'New' };

    await new UserRepository(asPrismaService(prisma)).create(data);
    expect(prisma.user.create).toHaveBeenCalledWith({ data });
  });

  it('updates a user', async () => {
    const prisma = createPrismaMock();

    await new UserRepository(asPrismaService(prisma)).update('user-id', { displayName: 'Updated' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { displayName: 'Updated' },
    });
  });

  it('soft deletes a user', async () => {
    const prisma = createPrismaMock();

    await new UserRepository(asPrismaService(prisma)).delete('user-id');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { deletedAt: expect.any(Date), isActive: false },
    });
  });
});

describe('ProjectRepository', () => {
  it('finds filtered projects with pagination and total count', async () => {
    const prisma = createPrismaMock();
    prisma.project.findMany.mockResolvedValue([]);
    prisma.project.count.mockResolvedValue(0);

    await new ProjectRepository(asPrismaService(prisma)).findMany({
      ownerId: 'owner-id',
      search: 'review',
      take: 20,
      skip: 0,
      sort: 'name',
      order: 'asc',
    });

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'owner-id', deletedAt: null }),
        orderBy: { name: 'asc' },
        skip: 0,
        take: 20,
      }),
    );
    expect(prisma.project.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ ownerId: 'owner-id' }) }),
    );
  });

  it('finds active projects by id and owner', async () => {
    const prisma = createPrismaMock();
    prisma.project.findUnique.mockResolvedValue(null);
    prisma.project.findFirst.mockResolvedValue({ id: 'project-id' });

    await new ProjectRepository(asPrismaService(prisma)).findActiveById('project-id');
    await new ProjectRepository(asPrismaService(prisma)).findActiveByIdForOwner(
      'project-id',
      'owner-id',
    );

    expect(prisma.project.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'project-id', deletedAt: null },
      include: expect.anything(),
    });
    expect(prisma.project.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: 'project-id', ownerId: 'owner-id', deletedAt: null },
      include: expect.anything(),
    });
  });

  it('finds projects by owner', async () => {
    const prisma = createPrismaMock();

    await new ProjectRepository(asPrismaService(prisma)).findByOwner('owner-id', {
      take: 10,
      skip: 0,
    });
    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'owner-id', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 10,
    });
  });

  it('syncs project tags and loads project history with actor fields', async () => {
    const prisma = createPrismaMock();
    prisma.projectHistory.findMany.mockResolvedValue([]);
    const repository = new ProjectRepository(asPrismaService(prisma));

    await repository.syncTags('project-id', ['backend', 'mvp']);
    await repository.createHistory('project-id', 'user-id', 'UPDATED', { name: 'New name' });
    await repository.findHistory('project-id');

    expect(prisma.projectTag.deleteMany).toHaveBeenCalledWith({
      where: { projectId: 'project-id' },
    });
    expect(prisma.projectTag.createMany).toHaveBeenCalledWith({
      data: [
        { projectId: 'project-id', name: 'backend' },
        { projectId: 'project-id', name: 'mvp' },
      ],
    });
    expect(prisma.projectHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ projectId: 'project-id', actorId: 'user-id' }),
    });
    expect(prisma.projectHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: 'project-id' } }),
    );
  });

  it('creates a project', async () => {
    const prisma = createPrismaMock();
    const data = { name: 'Project', owner: { connect: { id: 'owner-id' } } };

    await new ProjectRepository(asPrismaService(prisma)).create(data);
    expect(prisma.project.create).toHaveBeenCalledWith({ data });
  });

  it('updates a project', async () => {
    const prisma = createPrismaMock();

    await new ProjectRepository(asPrismaService(prisma)).update('project-id', { name: 'Updated' });
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'project-id' },
      data: { name: 'Updated' },
    });
  });

  it('archives a project', async () => {
    const prisma = createPrismaMock();

    await new ProjectRepository(asPrismaService(prisma)).archive('project-id');
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-id' },
        data: expect.objectContaining({ status: 'ARCHIVED' }),
      }),
    );
  });
});

describe('ScanRepository', () => {
  it('finds scans by project', async () => {
    const prisma = createPrismaMock();

    await new ScanRepository(asPrismaService(prisma)).findByProject('project-id');
    expect(prisma.scan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: 'project-id', deletedAt: null } }),
    );
  });

  it('creates a scan', async () => {
    const prisma = createPrismaMock();
    const data = { project: { connect: { id: 'project-id' } } };

    await new ScanRepository(asPrismaService(prisma)).create(data);
    expect(prisma.scan.create).toHaveBeenCalledWith({ data });
  });

  it('updates scan progress', async () => {
    const prisma = createPrismaMock();

    await new ScanRepository(asPrismaService(prisma)).updateProgress('scan-id', 42);
    expect(prisma.scan.update).toHaveBeenCalledWith({
      where: { id: 'scan-id' },
      data: { progress: 42 },
    });
  });

  it('finishes a scan', async () => {
    const prisma = createPrismaMock();

    await new ScanRepository(asPrismaService(prisma)).finish('scan-id', ScanStatus.COMPLETED);
    expect(prisma.scan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'scan-id' },
        data: expect.objectContaining({ progress: 100, status: 'COMPLETED' }),
      }),
    );
  });

  it('counts the latest logical review attempt instead of every retry row', async () => {
    const prisma = createPrismaMock();
    prisma.aIRequest.findMany.mockResolvedValue([
      { id: 'project-1-attempt-1', chunkId: 'project:architecture', status: 'FAILED' },
      { id: 'file-1-attempt-1', chunkId: 'file:src/app.ts', status: 'FAILED' },
      { id: 'project-1-attempt-2', chunkId: 'project:architecture', status: 'FAILED' },
      { id: 'file-1-attempt-2', chunkId: 'file:src/app.ts', status: 'FAILED' },
    ]);

    await expect(
      new ScanRepository(asPrismaService(prisma)).reviewProgress('scan-id'),
    ).resolves.toEqual({
      total: 2,
      completed: 0,
      failed: 2,
    });
    expect(prisma.aIRequest.findMany).toHaveBeenCalledWith({
      where: { scanId: 'scan-id' },
      select: { id: true, chunkId: true, status: true },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('resets review requests and usage before a fresh pipeline retry', async () => {
    const prisma = createPrismaMock();

    await new ScanRepository(asPrismaService(prisma)).resetReviewRequests('scan-id');

    expect(prisma.aIRequest.deleteMany).toHaveBeenCalledWith({ where: { scanId: 'scan-id' } });
    expect(prisma.aIUsage.deleteMany).toHaveBeenCalledWith({ where: { scanId: 'scan-id' } });
  });
});

describe('ReportRepository', () => {
  it('finds a report by scan id', async () => {
    const prisma = createPrismaMock();

    await new ReportRepository(asPrismaService(prisma)).findByScan('scan-id');
    expect(prisma.report.findUnique).toHaveBeenCalledWith({ where: { scanId: 'scan-id' } });
  });

  it('creates a report', async () => {
    const prisma = createPrismaMock();
    const data = {
      scan: { connect: { id: 'scan-id' } },
      project: { connect: { id: 'project-id' } },
    };

    await new ReportRepository(asPrismaService(prisma)).create(data);
    expect(prisma.report.create).toHaveBeenCalledWith({ data });
  });

  it('updates a report', async () => {
    const prisma = createPrismaMock();

    await new ReportRepository(asPrismaService(prisma)).update('report-id', { summary: 'Updated' });
    expect(prisma.report.update).toHaveBeenCalledWith({
      where: { id: 'report-id' },
      data: { summary: 'Updated' },
    });
  });
});

describe('FindingRepository', () => {
  it('finds findings by report', async () => {
    const prisma = createPrismaMock();

    await new FindingRepository(asPrismaService(prisma)).findByReport('report-id', { take: 20 });
    expect(prisma.finding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { reportId: 'report-id' }, take: 20 }),
    );
  });

  it('finds findings by severity', async () => {
    const prisma = createPrismaMock();

    await new FindingRepository(asPrismaService(prisma)).findBySeverity(Severity.HIGH);
    expect(prisma.finding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { severity: Severity.HIGH } }),
    );
  });

  it('creates many findings', async () => {
    const prisma = createPrismaMock();
    const data = [
      {
        scanId: 'scan-id',
        filePath: 'src/main.ts',
        severity: Severity.LOW,
        category: FindingCategory.STYLE,
        title: 'Title',
        description: 'Description',
      },
    ];

    await new FindingRepository(asPrismaService(prisma)).createMany(data);
    expect(prisma.finding.createMany).toHaveBeenCalledWith({ data, skipDuplicates: true });
  });

  it('deletes findings by report', async () => {
    const prisma = createPrismaMock();

    await new FindingRepository(asPrismaService(prisma)).deleteByReport('report-id');
    expect(prisma.finding.deleteMany).toHaveBeenCalledWith({ where: { reportId: 'report-id' } });
  });
});

describe('UploadedFileRepository', () => {
  it('creates an uploaded file', async () => {
    const prisma = createPrismaMock();
    const data = {
      project: { connect: { id: 'project-id' } },
      objectKey: 'projects/demo.zip',
      bucket: 'projects',
      filename: 'demo.zip',
      size: 1n,
      mimeType: 'application/zip',
      checksum: 'sha256',
    };

    await new UploadedFileRepository(asPrismaService(prisma)).create(data);
    expect(prisma.uploadedFile.create).toHaveBeenCalledWith({ data });
  });

  it('finds uploaded files by project', async () => {
    const prisma = createPrismaMock();

    await new UploadedFileRepository(asPrismaService(prisma)).findByProject('project-id');
    expect(prisma.uploadedFile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: 'project-id', deletedAt: null } }),
    );
  });

  it('soft-deletes all uploaded files for a project', async () => {
    const prisma = createPrismaMock();

    await new UploadedFileRepository(asPrismaService(prisma)).deleteProjectFiles('project-id');
    expect(prisma.uploadedFile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: 'project-id', deletedAt: null } }),
    );
  });
});

describe('RefreshTokenRepository', () => {
  it('finds a refresh token by hash', async () => {
    const prisma = createPrismaMock();

    await new RefreshTokenRepository(asPrismaService(prisma)).findByHash('hash');
    expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({ where: { tokenHash: 'hash' } });
  });

  it('revokes one refresh token', async () => {
    const prisma = createPrismaMock();

    await new RefreshTokenRepository(asPrismaService(prisma)).revoke('hash');
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: 'hash' } }),
    );
  });

  it('deletes expired refresh tokens', async () => {
    const prisma = createPrismaMock();
    const now = new Date('2026-08-01T00:00:00.000Z');

    await new RefreshTokenRepository(asPrismaService(prisma)).deleteExpired(now);
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: now } },
    });
  });
});

describe('QueueJobRepository', () => {
  it('finds waiting queue jobs', async () => {
    const prisma = createPrismaMock();

    await new QueueJobRepository(asPrismaService(prisma)).findWaiting({ take: 5 });
    expect(prisma.queueJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: QueueStatus.WAITING }, take: 5 }),
    );
  });

  it('finds failed queue jobs', async () => {
    const prisma = createPrismaMock();

    await new QueueJobRepository(asPrismaService(prisma)).findFailed();
    expect(prisma.queueJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: QueueStatus.FAILED } }),
    );
  });
});

describe('Chat repositories', () => {
  it('creates a chat session', async () => {
    const prisma = createPrismaMock();
    const data = {
      project: { connect: { id: 'project-id' } },
      user: { connect: { id: 'user-id' } },
    };

    await new ChatSessionRepository(asPrismaService(prisma)).createSession(data);
    expect(prisma.chatSession.create).toHaveBeenCalledWith({ data });
  });

  it('adds a chat message', async () => {
    const prisma = createPrismaMock();
    const data = {
      session: { connect: { id: 'session-id' } },
      role: MessageRole.USER,
      content: 'Question',
    };

    await new ChatMessageRepository(asPrismaService(prisma)).addMessage(data);
    expect(prisma.chatMessage.create).toHaveBeenCalledWith({ data });
  });

  it('deletes chat messages by session', async () => {
    const prisma = createPrismaMock();

    await new ChatMessageRepository(asPrismaService(prisma)).deleteMessages('session-id');
    expect(prisma.chatMessage.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: 'session-id' },
    });
  });
});
