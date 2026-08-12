import { Role, UploadStatus, Visibility, ProjectStatus } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../../../../src/common/auth/types/auth.types';
import { UploadEvents } from '../../../../src/modules/uploads/events/upload.events';
import { UploadsService } from '../../../../src/modules/uploads/services/uploads.service';
import { InvalidArchiveException } from '../../../../src/modules/uploads/exceptions/upload.exceptions';

const user: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'u@test',
  role: Role.USER,
};
const project = {
  id: '00000000-0000-4000-8000-000000000002',
  ownerId: user.id,
  organizationId: null,
  name: 'Project',
  description: null,
  language: 'TypeScript',
  githubUrl: null as string | null,
  githubBranch: null as string | null,
  visibility: Visibility.PRIVATE,
  status: ProjectStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  archivedAt: null,
  deletedAt: null,
  tags: [],
  _count: { scans: 0, uploadedFiles: 0 },
  scans: [],
};
const upload = {
  id: '00000000-0000-4000-8000-000000000003',
  projectId: project.id,
  uploadedById: user.id,
  objectKey: 'users/u/projects/p/uploads/u.zip',
  bucket: 'projects',
  filename: 'project.zip',
  size: 30n,
  mimeType: 'application/zip',
  checksum: 'sha256:test',
  sourceType: 'UPLOAD',
  sourceCommit: null,
  sourceRepo: null,
  sourceMessage: null,
  sourceCommittedAt: null,
  status: UploadStatus.COMPLETED,
  version: 1,
  createdAt: new Date(),
  deletedAt: null,
};

function setup() {
  const repository = {
    createNextVersion: vi.fn(async () => ({
      ...upload,
      status: UploadStatus.PENDING,
      checksum: 'pending',
    })),
    updateStatus: vi.fn(async (_id: string, status: UploadStatus) => ({ ...upload, status })),
    update: vi.fn(async () => upload),
    findByProject: vi.fn(async () => [upload]),
    findBySourceCommit: vi.fn(async (): Promise<typeof upload | null> => null),
    hasSourceType: vi.fn(async () => false),
  };
  const projects = {
    findActiveByIdForOwner: vi.fn(async () => project),
    findActiveById: vi.fn(async () => project),
    update: vi.fn(async () => project),
  };
  const storage = {
    upload: vi.fn(async () => ({ bucket: 'projects', key: upload.objectKey })),
    delete: vi.fn(async () => undefined),
  };
  const validator = { validate: vi.fn(async () => ({ entries: 1, uncompressedSize: 10 })) };
  const events = new UploadEvents();
  const logger = { log: vi.fn() };
  return {
    repository,
    projects,
    storage,
    validator,
    events,
    service: new UploadsService(
      projects as never,
      repository as never,
      storage as never,
      validator as never,
      events,
      logger as never,
    ),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('UploadsService', () => {
  it('creates version one and uploads through StorageService', async () => {
    const { service, storage, repository } = setup();
    const result = await service.create(user, project.id, {
      originalname: 'project.zip',
      mimetype: 'application/zip',
      buffer: Buffer.alloc(30),
    });
    expect(result.version).toBe(1);
    expect(storage.upload).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'projects', key: expect.stringContaining('/uploads/') }),
    );
    expect(repository.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: UploadStatus.COMPLETED }),
    );
  });

  it('validates before storage upload', async () => {
    const { service, storage, validator } = setup();
    await service.create(user, project.id, {
      originalname: 'project.zip',
      mimetype: 'application/zip',
      buffer: Buffer.alloc(30),
    });
    expect(validator.validate).toHaveBeenCalledOnce();
    expect(storage.upload).toHaveBeenCalledOnce();
  });

  it('increments versions using repository state', async () => {
    const { service, repository } = setup();
    repository.createNextVersion.mockResolvedValue({
      ...upload,
      version: 4,
      status: UploadStatus.PENDING,
      checksum: 'pending',
    });
    repository.update.mockResolvedValue({ ...upload, version: 4 });
    await expect(
      service.create(user, project.id, {
        originalname: 'project.zip',
        mimetype: 'application/zip',
        buffer: Buffer.alloc(30),
      }),
    ).resolves.toMatchObject({ version: 4 });
  });

  it('marks failed uploads when validation fails', async () => {
    const { service, repository, validator } = setup();
    validator.validate.mockRejectedValue(new InvalidArchiveException('corrupted'));
    await expect(
      service.create(user, project.id, {
        originalname: 'project.zip',
        mimetype: 'application/zip',
        buffer: Buffer.alloc(30),
      }),
    ).rejects.toThrow('corrupted');
    expect(repository.updateStatus).toHaveBeenCalledWith(expect.any(String), UploadStatus.FAILED);
  });

  it('rejects projects outside the user scope', async () => {
    const { service, projects } = setup();
    projects.findActiveById.mockResolvedValue({ ...project, ownerId: 'another-user' });
    await expect(
      service.create(user, project.id, {
        originalname: 'project.zip',
        mimetype: 'application/zip',
        buffer: Buffer.alloc(30),
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('blocks manual uploads after a GitHub repository is connected', async () => {
    const { service, projects, storage } = setup();
    projects.findActiveById.mockResolvedValue({
      ...project,
      githubUrl: 'https://github.com/reviewsha/reviewsha',
      githubBranch: 'main',
    });

    await expect(
      service.create(user, project.id, {
        originalname: 'project.zip',
        mimetype: 'application/zip',
        buffer: Buffer.alloc(30),
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('imports a GitHub commit as an immutable version with commit metadata', async () => {
    const { service, projects, repository } = setup();
    const connectedProject = {
      ...project,
      githubUrl: 'https://github.com/reviewsha/reviewsha',
      githubBranch: 'main',
    };
    projects.findActiveById.mockResolvedValue(connectedProject);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            '<feed><entry><id>tag:github.com,2008:Grit::Commit/a1b2c3d4</id><title>Fix auth flow</title><updated>2026-08-11T12:00:00.000Z</updated></entry></feed>',
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(new Response(Buffer.from('zip archive'), { status: 200 })),
    );

    await service.importGithub(user, project.id, {
      url: 'https://github.com/reviewsha/reviewsha/',
      branch: 'main',
    });

    expect(projects.update).toHaveBeenCalledWith(project.id, {
      githubUrl: 'https://github.com/reviewsha/reviewsha',
      githubBranch: 'main',
    });
    expect(repository.createNextVersion).toHaveBeenCalledWith(
      project.id,
      expect.objectContaining({
        sourceType: 'GITHUB',
        sourceCommit: 'a1b2c3d4',
        sourceRepo: 'https://github.com/reviewsha/reviewsha',
        sourceMessage: 'Fix auth flow',
        sourceCommittedAt: new Date('2026-08-11T12:00:00.000Z'),
      }),
    );
  });

  it('does not download a GitHub commit that is already present', async () => {
    const { service, projects, repository } = setup();
    projects.findActiveById.mockResolvedValue({
      ...project,
      githubUrl: 'https://github.com/reviewsha/reviewsha',
      githubBranch: 'main',
    });
    repository.hasSourceType.mockResolvedValue(true);
    repository.findBySourceCommit.mockResolvedValue(upload);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          '<feed><entry><id>tag:github.com,2008:Grit::Commit/a1b2c3d4</id><title>Already present</title><updated>2026-08-11T12:00:00.000Z</updated></entry></feed>',
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    await service.importGithub(user, project.id, {
      url: 'https://github.com/reviewsha/reviewsha',
      branch: 'main',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(repository.createNextVersion).not.toHaveBeenCalled();
  });

  it('imports public GitHub commits from the Atom feed without an API token', async () => {
    const { service, projects, repository } = setup();
    projects.findActiveById.mockResolvedValue({
      ...project,
      githubUrl: 'https://github.com/octocat/Hello-World',
      githubBranch: 'master',
    });
    repository.hasSourceType.mockResolvedValue(false);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            `<feed><entry><id>tag:github.com,2008:Grit::Commit/7fd1a60b01f91b314f59955a4e4d4e80d8edf11d</id><title>Initial commit</title><updated>2012-03-06T23:06:50Z</updated></entry></feed>`,
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(new Response(Buffer.from('zip archive'), { status: 200 })),
    );

    await service.importGithub(user, project.id, {
      url: 'https://github.com/octocat/Hello-World',
      branch: 'master',
    });

    expect(repository.createNextVersion).toHaveBeenCalledWith(
      project.id,
      expect.objectContaining({
        sourceCommit: '7fd1a60b01f91b314f59955a4e4d4e80d8edf11d',
        sourceMessage: 'Initial commit',
        sourceRepo: 'https://github.com/octocat/Hello-World',
      }),
    );
  });

  it('allows administrators to upload to any project', async () => {
    const { service, projects } = setup();
    await service.create({ ...user, role: Role.ADMIN }, project.id, {
      originalname: 'project.zip',
      mimetype: 'application/zip',
      buffer: Buffer.alloc(30),
    });
    expect(projects.findActiveById).toHaveBeenCalledWith(project.id);
  });

  it('lists upload history for an owned project', async () => {
    const { service, repository } = setup();
    const result = await service.list(user, project.id);
    expect(result.data).toHaveLength(1);
    expect(repository.findByProject).toHaveBeenCalledWith(project.id);
  });

  it('does not list uploads for an inaccessible project', async () => {
    const { service, projects } = setup();
    projects.findActiveById.mockResolvedValue({ ...project, ownerId: 'another-user' });
    await expect(service.list(user, project.id)).rejects.toMatchObject({ status: 403 });
  });

  it('uses generated storage keys instead of the original filename', async () => {
    const { service, repository } = setup();
    await service.create(user, project.id, {
      originalname: '../../secret.zip',
      mimetype: 'application/zip',
      buffer: Buffer.alloc(30),
    });
    expect(repository.createNextVersion).toHaveBeenCalledWith(
      project.id,
      expect.objectContaining({
        objectKey: expect.stringMatching(/^users\/.*\/uploads\/.*\.zip$/),
      }),
    );
  });

  it('publishes a completed event after persistence', async () => {
    const { service, events } = setup();
    const listener = vi.fn();
    events.on('upload.completed', listener);
    await service.create(user, project.id, {
      originalname: 'project.zip',
      mimetype: 'application/zip',
      buffer: Buffer.alloc(30),
    });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ uploadId: upload.id, version: 1 }),
    );
  });
});
