import { Role, UploadStatus, Visibility, ProjectStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
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
  status: UploadStatus.COMPLETED,
  version: 1,
  createdAt: new Date(),
  deletedAt: null,
};

function setup() {
  const repository = {
    getNextVersion: vi.fn(async () => 1),
    create: vi.fn(async () => ({ ...upload, status: UploadStatus.PENDING, checksum: 'pending' })),
    updateStatus: vi.fn(async (_id: string, status: UploadStatus) => ({ ...upload, status })),
    update: vi.fn(async () => upload),
    findByProject: vi.fn(async () => [upload]),
  };
  const projects = {
    findActiveByIdForOwner: vi.fn(async () => project),
    findActiveById: vi.fn(async () => project),
  };
  const storage = { upload: vi.fn(async () => ({ bucket: 'projects', key: upload.objectKey })) };
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
    repository.getNextVersion.mockResolvedValue(4);
    repository.create.mockResolvedValue({
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
    projects.findActiveByIdForOwner.mockImplementation(async () => null as never);
    await expect(
      service.create(user, project.id, {
        originalname: 'project.zip',
        mimetype: 'application/zip',
        buffer: Buffer.alloc(30),
      }),
    ).rejects.toMatchObject({ status: 404 });
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
    projects.findActiveByIdForOwner.mockImplementation(async () => null as never);
    await expect(service.list(user, project.id)).rejects.toMatchObject({ status: 404 });
  });

  it('uses generated storage keys instead of the original filename', async () => {
    const { service, repository } = setup();
    await service.create(user, project.id, {
      originalname: '../../secret.zip',
      mimetype: 'application/zip',
      buffer: Buffer.alloc(30),
    });
    expect(repository.create).toHaveBeenCalledWith(
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
