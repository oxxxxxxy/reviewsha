import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Role, type User } from '@prisma/client';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { ApiLoggerService } from '../../../../src/common/logger/api-logger.service';
import { UserRepository } from '../../../../src/repositories/user/user.repository';
import { UserMapper } from '../../../../src/modules/users/mappers/user.mapper';
import { UsersService } from '../../../../src/modules/users/services/users.service';
import { UpdateUserDto } from '../../../../src/modules/users/dto/update-user.dto';
import { UserQueryDto } from '../../../../src/modules/users/dto/user-query.dto';

const now = new Date('2026-08-02T10:00:00.000Z');

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'developer@reviewsha.local',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$placeholder$placeholder',
    displayName: 'Developer',
    avatarUrl: null,
    role: Role.USER,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

interface UserRepositoryMock {
  findMany: Mock;
  findById: Mock;
  findByEmail: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
}

function createRepositoryMock(): UserRepositoryMock {
  return {
    findMany: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createService() {
  const repository = createRepositoryMock();
  const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as ApiLoggerService & {
    log: ReturnType<typeof vi.fn>;
  };
  return {
    service: new UsersService(repository as unknown as UserRepository, logger),
    repository,
    logger,
  };
}

function defaultQuery(overrides: Partial<UserQueryDto> = {}): UserQueryDto {
  return Object.assign(new UserQueryDto(), overrides);
}

describe('UsersService', () => {
  it('creates a user', async () => {
    const { service, repository } = createService();
    repository.findByEmail.mockResolvedValue(null);
    repository.create.mockResolvedValue(createUser());

    const result = await service.create({
      email: 'Developer@Reviewsha.Local',
      password: 'strong-password',
      displayName: 'Developer',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'developer@reviewsha.local', displayName: 'Developer' }),
    );
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('hashes password when creating a user', async () => {
    const { service, repository } = createService();
    repository.findByEmail.mockResolvedValue(null);
    repository.create.mockResolvedValue(createUser());

    await service.create({ email: 'a@b.dev', password: 'strong-password', displayName: 'Dev' });

    const createPayload = repository.create.mock.calls[0]?.[0] as { passwordHash: string };
    expect(createPayload.passwordHash).toMatch(/^\$argon2/);
    expect(createPayload.passwordHash).not.toBe('strong-password');
    await expect(argon2.verify(createPayload.passwordHash, 'strong-password')).resolves.toBe(true);
  });

  it('logs user creation without password', async () => {
    const { service, repository, logger } = createService();
    repository.findByEmail.mockResolvedValue(null);
    repository.create.mockResolvedValue(createUser());

    await service.create({ email: 'a@b.dev', password: 'strong-password', displayName: 'Dev' });

    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('User created'),
      'UsersService',
    );
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain('strong-password');
  });

  it('rejects duplicate email', async () => {
    const { service, repository } = createService();
    repository.findByEmail.mockResolvedValue(createUser());

    await expect(
      service.create({
        email: 'developer@reviewsha.local',
        password: 'strong-password',
        displayName: 'Dev',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('gets a user by id', async () => {
    const { service, repository } = createService();
    repository.findById.mockResolvedValue(createUser());

    await expect(service.findById('user-id')).resolves.toMatchObject({ id: expect.any(String) });
    expect(repository.findById).toHaveBeenCalledWith('user-id');
  });

  it('throws when user by id is missing', async () => {
    const { service, repository } = createService();
    repository.findById.mockResolvedValue(null);

    await expect(service.findById('missing-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('gets a paginated list', async () => {
    const { service, repository } = createService();
    repository.findMany.mockResolvedValue({ items: [createUser()], total: 1 });

    const result = await service.findAll(defaultQuery({ page: 1, limit: 20 }));

    expect(result.items).toHaveLength(1);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, pages: 1 });
  });

  it('searches by email', async () => {
    const { service, repository } = createService();
    repository.findMany.mockResolvedValue({ items: [], total: 0 });

    await service.findAll(defaultQuery({ search: 'developer@reviewsha.local' }));

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'developer@reviewsha.local' }),
    );
  });

  it('searches by displayName', async () => {
    const { service, repository } = createService();
    repository.findMany.mockResolvedValue({ items: [], total: 0 });

    await service.findAll(defaultQuery({ search: 'Developer' }));

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Developer' }),
    );
  });

  it('sorts by email', async () => {
    const { service, repository } = createService();
    repository.findMany.mockResolvedValue({ items: [], total: 0 });

    await service.findAll(defaultQuery({ sort: 'email', order: 'asc' }));

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'email', order: 'asc' }),
    );
  });

  it('sorts by displayName', async () => {
    const { service, repository } = createService();
    repository.findMany.mockResolvedValue({ items: [], total: 0 });

    await service.findAll(defaultQuery({ sort: 'displayName', order: 'desc' }));

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'displayName' }),
    );
  });

  it('sorts by createdAt', async () => {
    const { service, repository } = createService();
    repository.findMany.mockResolvedValue({ items: [], total: 0 });

    await service.findAll(defaultQuery({ sort: 'createdAt' }));

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'createdAt' }),
    );
  });

  it('updates a user', async () => {
    const { service, repository } = createService();
    repository.findById.mockResolvedValue(createUser());
    repository.update.mockResolvedValue(createUser({ displayName: 'Updated' }));

    await expect(service.update('user-id', { displayName: 'Updated' })).resolves.toMatchObject({
      displayName: 'Updated',
    });
  });

  it('throws when updating a missing user', async () => {
    const { service, repository } = createService();
    repository.findById.mockResolvedValue(null);

    await expect(service.update('missing-id', { displayName: 'Updated' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws for empty update payload', async () => {
    const { service, repository } = createService();
    repository.findById.mockResolvedValue(createUser());

    await expect(service.update('user-id', {} as UpdateUserDto)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('deletes a user', async () => {
    const { service, repository } = createService();
    repository.findById.mockResolvedValue(createUser());
    repository.delete.mockResolvedValue(createUser());

    await expect(service.delete('user-id')).resolves.toBeUndefined();
    expect(repository.delete).toHaveBeenCalledWith('user-id');
  });

  it('throws when deleting a missing user', async () => {
    const { service, repository } = createService();
    repository.findById.mockResolvedValue(null);

    await expect(service.delete('missing-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps User entity without passwordHash', () => {
    const response = UserMapper.toResponse(createUser());

    expect(response).not.toHaveProperty('passwordHash');
    expect(response).toMatchObject({
      email: 'developer@reviewsha.local',
      createdAt: now.toISOString(),
    });
  });

  it('keeps passwordHash absent in list responses', async () => {
    const { service, repository } = createService();
    repository.findMany.mockResolvedValue({ items: [createUser()], total: 1 });

    const response = await service.findAll(defaultQuery());

    expect(JSON.stringify(response)).not.toContain('passwordHash');
  });
});
