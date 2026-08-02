import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenRevokedReason, Role, type RefreshToken, type User } from '@prisma/client';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ApiLoggerService } from '../../../../src/common/logger/api-logger.service';
import { RefreshTokenRepository } from '../../../../src/repositories/auth/refresh-token.repository';
import { TokenService } from '../../../../src/modules/auth/services/token.service';
import { SessionService } from '../../../../src/modules/sessions/services/session.service';

const now = new Date('2026-08-02T12:00:00.000Z');

function createUser(): User {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'developer@reviewsha.local',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$abcdef',
    displayName: 'Developer',
    avatarUrl: null,
    role: Role.USER,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

function createRefreshToken(overrides: Partial<RefreshToken> = {}): RefreshToken {
  return {
    id: '00000000-0000-4000-8000-000000000101',
    userId: createUser().id,
    tokenHash: '$argon2id$v=19$m=65536,t=3,p=4$abcdef',
    jti: 'refresh-jti',
    userAgent: 'Mozilla/5.0 Chrome Linux',
    ip: '127.0.0.1',
    browser: 'Chrome',
    os: 'Linux',
    lastUsedAt: null,
    lastIp: null,
    lastUserAgent: null,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: now,
    revokedAt: null,
    revokedReason: null,
    ...overrides,
  };
}

function createMocks() {
  const config = {
    getOrThrow: vi.fn(() => ({
      access: {
        secret: 'access-secret',
        expiresIn: '15m',
        issuer: 'reviewsha-api',
        audience: 'reviewsha-clients',
        algorithm: 'HS256',
      },
      refresh: {
        secret: 'refresh-secret',
        expiresIn: '30d',
        issuer: 'reviewsha-api',
        audience: 'reviewsha-clients',
        algorithm: 'HS256',
      },
    })),
    get: vi.fn((key: string) => (key === 'sessions.maxSessionsPerUser' ? 2 : undefined)),
  } as unknown as ConfigService;
  const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as ApiLoggerService & {
    log: Mock;
    warn: Mock;
  };
  const repository = {
    create: vi.fn(),
    findByJti: vi.fn(),
    findById: vi.fn(),
    findActiveByUserId: vi.fn(),
    revokeById: vi.fn(),
    revokeAll: vi.fn(),
    updateActivity: vi.fn(),
    enforceSessionLimit: vi.fn(),
    deleteExpired: vi.fn(),
  };
  const tokenService = new TokenService(new JwtService(), config, logger);
  const service = new SessionService(
    repository as unknown as RefreshTokenRepository,
    tokenService,
    config,
    logger,
  );
  return { service, tokenService, repository, logger };
}

describe('SessionService', () => {
  it('creates a session with hashed refresh token and device info', async () => {
    const { service, repository } = createMocks();
    repository.create.mockResolvedValue(createRefreshToken());
    repository.enforceSessionLimit.mockResolvedValue(0);

    const result = await service.createSession(createUser(), {
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Chrome Linux',
    });

    expect(result.accessToken).toMatch(/^eyJ/);
    expect(result.refreshToken).toMatch(/^eyJ/);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        jti: expect.any(String),
        tokenHash: expect.stringMatching(/^\$argon2/),
        browser: 'Chrome',
        os: 'Linux',
      }),
    );
  });

  it('enforces max session limit after creation', async () => {
    const { service, repository } = createMocks();
    repository.create.mockResolvedValue(createRefreshToken());
    repository.enforceSessionLimit.mockResolvedValue(1);

    await service.createSession(createUser());

    expect(repository.enforceSessionLimit).toHaveBeenCalledWith(
      createUser().id,
      2,
      RefreshTokenRevokedReason.ADMIN_REVOKED,
    );
  });

  it('validates a refresh session', async () => {
    const { service, tokenService, repository } = createMocks();
    const hash = await tokenService.hashRefreshToken('refresh-token');
    repository.findByJti.mockResolvedValue(createRefreshToken({ tokenHash: hash }));
    repository.updateActivity.mockResolvedValue(createRefreshToken());

    await expect(
      service.validateRefreshSession(createUser().id, 'refresh-token', 'refresh-jti'),
    ).resolves.toMatchObject({ id: createRefreshToken().id });
  });

  it('updates activity when validating a refresh session', async () => {
    const { service, tokenService, repository } = createMocks();
    const hash = await tokenService.hashRefreshToken('refresh-token');
    repository.findByJti.mockResolvedValue(createRefreshToken({ tokenHash: hash }));
    repository.updateActivity.mockResolvedValue(createRefreshToken());

    await service.validateRefreshSession(createUser().id, 'refresh-token', 'refresh-jti', {
      ip: '10.0.0.1',
      userAgent: 'UA',
    });

    expect(repository.updateActivity).toHaveBeenCalledWith(
      createRefreshToken().id,
      expect.objectContaining({ lastIp: '10.0.0.1', lastUserAgent: 'UA' }),
    );
  });

  it('rotates session and revokes old one', async () => {
    const { service, tokenService, repository } = createMocks();
    const hash = await tokenService.hashRefreshToken('refresh-token');
    repository.findByJti.mockResolvedValue(createRefreshToken({ tokenHash: hash }));
    repository.updateActivity.mockResolvedValue(createRefreshToken());
    repository.create.mockResolvedValue(createRefreshToken({ id: 'new-id', jti: 'new-jti' }));
    repository.enforceSessionLimit.mockResolvedValue(0);
    repository.revokeById.mockResolvedValue(createRefreshToken({ revokedAt: now }));

    const result = await service.rotateSession(createUser(), 'refresh-token', 'refresh-jti');

    expect(result.refreshToken).toMatch(/^eyJ/);
    expect(repository.revokeById).toHaveBeenCalledWith(
      createRefreshToken().id,
      RefreshTokenRevokedReason.ROTATION,
    );
  });

  it('detects reuse of revoked refresh token and revokes all sessions', async () => {
    const { service, repository } = createMocks();
    repository.findByJti.mockResolvedValue(createRefreshToken({ revokedAt: now }));
    repository.revokeAll.mockResolvedValue({ count: 2 });

    await expect(
      service.validateRefreshSession(createUser().id, 'refresh-token', 'refresh-jti'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repository.revokeAll).toHaveBeenCalledWith(
      createUser().id,
      RefreshTokenRevokedReason.REUSE_DETECTED,
    );
  });

  it('rejects expired refresh session', async () => {
    const { service, repository } = createMocks();
    repository.findByJti.mockResolvedValue(
      createRefreshToken({ expiresAt: new Date(Date.now() - 1_000) }),
    );

    await expect(
      service.validateRefreshSession(createUser().id, 'refresh-token', 'refresh-jti'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects mismatched refresh token hash and revokes all sessions', async () => {
    const { service, tokenService, repository } = createMocks();
    const hash = await tokenService.hashRefreshToken('other-token');
    repository.findByJti.mockResolvedValue(createRefreshToken({ tokenHash: hash }));
    repository.revokeAll.mockResolvedValue({ count: 2 });

    await expect(
      service.validateRefreshSession(createUser().id, 'refresh-token', 'refresh-jti'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repository.revokeAll).toHaveBeenCalledWith(
      createUser().id,
      RefreshTokenRevokedReason.REUSE_DETECTED,
    );
  });

  it('revokes one session by token', async () => {
    const { service, tokenService, repository } = createMocks();
    const hash = await tokenService.hashRefreshToken('refresh-token');
    repository.findByJti.mockResolvedValue(createRefreshToken({ tokenHash: hash }));
    repository.updateActivity.mockResolvedValue(createRefreshToken());
    repository.revokeById.mockResolvedValue(createRefreshToken({ revokedAt: now }));

    await service.revokeSessionByToken(createUser().id, 'refresh-token', 'refresh-jti');

    expect(repository.revokeById).toHaveBeenCalledWith(
      createRefreshToken().id,
      RefreshTokenRevokedReason.LOGOUT,
    );
  });

  it('revokes all sessions', async () => {
    const { service, repository } = createMocks();
    repository.revokeAll.mockResolvedValue({ count: 2 });

    await service.revokeAllSessions(createUser().id);

    expect(repository.revokeAll).toHaveBeenCalledWith(
      createUser().id,
      RefreshTokenRevokedReason.LOGOUT_ALL,
    );
  });

  it('lists active sessions', async () => {
    const { service, repository } = createMocks();
    repository.findActiveByUserId.mockResolvedValue([createRefreshToken()]);

    await expect(service.listSessions(createUser().id, 'refresh-jti')).resolves.toEqual([
      expect.objectContaining({ current: true, browser: 'Chrome', os: 'Linux' }),
    ]);
  });

  it('revokes selected session by id', async () => {
    const { service, repository } = createMocks();
    repository.findById.mockResolvedValue(createRefreshToken());
    repository.revokeById.mockResolvedValue(createRefreshToken({ revokedAt: now }));

    await service.revokeSession(createUser().id, createRefreshToken().id);

    expect(repository.revokeById).toHaveBeenCalledWith(
      createRefreshToken().id,
      RefreshTokenRevokedReason.LOGOUT,
    );
  });

  it('cleans expired sessions', async () => {
    const { service, repository } = createMocks();
    repository.deleteExpired.mockResolvedValue({ count: 3 });

    await expect(service.cleanupExpiredSessions(now)).resolves.toBe(3);
  });
});
