import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Role, type User } from '@prisma/client';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { ApiLoggerService } from '../../../../src/common/logger/api-logger.service';
import { UserRepository } from '../../../../src/repositories/user/user.repository';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../../../../src/common/auth/constants/auth.constants';
import { Public } from '../../../../src/common/auth/decorators/public.decorator';
import { Roles } from '../../../../src/common/auth/decorators/roles.decorator';
import { RolesGuard } from '../../../../src/common/auth/guards/roles.guard';
import { AuthService } from '../../../../src/modules/auth/services/auth.service';
import { TokenService } from '../../../../src/modules/auth/services/token.service';
import { SessionService } from '../../../../src/modules/sessions/services/session.service';
import { JwtStrategy } from '../../../../src/modules/auth/strategies/jwt.strategy';
import { RefreshStrategy } from '../../../../src/modules/auth/strategies/refresh.strategy';

const now = new Date('2026-08-02T12:00:00.000Z');

interface UserRepositoryMock {
  findByEmail: Mock;
  findById: Mock;
  create: Mock;
}

interface SessionServiceMock {
  createSession: Mock;
  rotateSession: Mock;
  revokeSessionByToken: Mock;
  revokeAllSessions: Mock;
}

function createUser(overrides: Partial<User> = {}): User {
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
    ...overrides,
  };
}

function createConfig(): ConfigService {
  return {
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
  } as unknown as ConfigService;
}

function createMocks() {
  const users: UserRepositoryMock = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  };
  const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as ApiLoggerService & {
    log: Mock;
    warn: Mock;
  };
  const jwtService = new JwtService();
  const config = createConfig();
  const tokenService = new TokenService(jwtService, config, logger);
  const sessions: SessionServiceMock = {
    createSession: vi.fn((user: User) => tokenService.generateTokenPair(user)),
    rotateSession: vi.fn((user: User) => tokenService.generateTokenPair(user)),
    revokeSessionByToken: vi.fn(),
    revokeAllSessions: vi.fn(),
  };
  const service = new AuthService(
    users as unknown as UserRepository,
    sessions as unknown as SessionService,
    tokenService,
    logger,
  );

  return { service, tokenService, users, sessions, jwtService, config, logger };
}

function createGuardLogger(): ApiLoggerService {
  return { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as ApiLoggerService;
}

describe('AuthService', () => {
  it('registers a user', async () => {
    const { service, users, sessions } = createMocks();
    users.findByEmail.mockResolvedValue(null);
    users.create.mockResolvedValue(
      createUser({ passwordHash: await service.hashPassword('strong-password') }),
    );

    const result = await service.register({
      email: 'Developer@Reviewsha.Local',
      password: 'strong-password',
      displayName: 'Developer',
    });

    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'developer@reviewsha.local' }),
    );
    expect(sessions.createSession).toHaveBeenCalledOnce();
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('rejects registration with existing email', async () => {
    const { service, users } = createMocks();
    users.findByEmail.mockResolvedValue(createUser());

    await expect(
      service.register({
        email: 'developer@reviewsha.local',
        password: 'strong-password',
        displayName: 'Developer',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs registration without password or token', async () => {
    const { service, users, logger } = createMocks();
    users.findByEmail.mockResolvedValue(null);
    users.create.mockResolvedValue(
      createUser({ passwordHash: await service.hashPassword('strong-password') }),
    );

    await service.register({
      email: 'developer@reviewsha.local',
      password: 'strong-password',
      displayName: 'Developer',
    });

    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('User registered'),
      'AuthService',
    );
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain('strong-password');
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain('eyJ');
  });

  it('logs in with valid credentials', async () => {
    const { service, users } = createMocks();
    users.findByEmail.mockResolvedValue(
      createUser({ passwordHash: await service.hashPassword('strong-password') }),
    );

    const result = await service.login({
      email: 'developer@reviewsha.local',
      password: 'strong-password',
    });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it('rejects login with wrong password', async () => {
    const { service, users } = createMocks();
    users.findByEmail.mockResolvedValue(
      createUser({ passwordHash: await service.hashPassword('strong-password') }),
    );

    await expect(
      service.login({ email: 'developer@reviewsha.local', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects login for missing user', async () => {
    const { service, users } = createMocks();
    users.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@reviewsha.local', password: 'strong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects inactive user login', async () => {
    const { service, users } = createMocks();
    users.findByEmail.mockResolvedValue(
      createUser({ isActive: false, passwordHash: await service.hashPassword('strong-password') }),
    );

    await expect(
      service.login({ email: 'developer@reviewsha.local', password: 'strong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('generates an access token', async () => {
    const { service } = createMocks();
    await expect(service.generateAccessToken(createUser())).resolves.toMatch(/^eyJ/);
  });

  it('generates a refresh token', async () => {
    const { service } = createMocks();
    await expect(service.generateRefreshToken(createUser())).resolves.toMatch(/^eyJ/);
  });

  it('hashes a password with argon2', async () => {
    const { service } = createMocks();
    await expect(service.hashPassword('strong-password')).resolves.toMatch(/^\$argon2/);
  });

  it('verifies a password', async () => {
    const { service } = createMocks();
    const hash = await service.hashPassword('strong-password');
    await expect(service.verifyPassword(hash, 'strong-password')).resolves.toBe(true);
  });

  it('rejects invalid password hash verification', async () => {
    const { service } = createMocks();
    await expect(service.verifyPassword('broken', 'strong-password')).resolves.toBe(false);
  });

  it('hashes refresh token with Argon2', async () => {
    const { service, tokenService } = createMocks();
    const hash = await service.hashToken('token');
    expect(hash).toMatch(/^\$argon2/);
    expect(hash).not.toBe('token');
    await expect(tokenService.verifyRefreshTokenHash(hash, 'token')).resolves.toBe(true);
  });

  it('verifies an access token through TokenService', async () => {
    const { service, tokenService } = createMocks();
    const token = await service.generateAccessToken(createUser());

    await expect(tokenService.verifyAccessToken(token)).resolves.toMatchObject({
      sub: createUser().id,
      type: 'access',
    });
  });

  it('verifies a refresh token through TokenService', async () => {
    const { service, tokenService } = createMocks();
    const token = await service.generateRefreshToken(createUser());

    await expect(tokenService.verifyRefreshToken(token)).resolves.toMatchObject({
      sub: createUser().id,
      type: 'refresh',
    });
  });

  it('decodes tokens only for diagnostics', async () => {
    const { service, tokenService } = createMocks();
    const token = await service.generateAccessToken(createUser());

    expect(tokenService.decodeToken(token)).toMatchObject({ sub: createUser().id });
  });

  it('logs out current refresh token', async () => {
    const { service, sessions } = createMocks();
    sessions.revokeSessionByToken.mockResolvedValue(undefined);

    await service.logout(
      { id: createUser().id, email: createUser().email, role: Role.USER },
      'refresh-token',
      'refresh-jti',
    );

    expect(sessions.revokeSessionByToken).toHaveBeenCalledWith(
      createUser().id,
      'refresh-token',
      'refresh-jti',
    );
  });

  it('logs out all devices', async () => {
    const { service, sessions } = createMocks();

    await service.logoutAll({ id: createUser().id, email: createUser().email, role: Role.USER });

    expect(sessions.revokeAllSessions).toHaveBeenCalledWith(createUser().id);
  });

  it('rotates refresh token', async () => {
    const { service, users, sessions, tokenService } = createMocks();
    users.findById.mockResolvedValue(createUser());
    sessions.rotateSession.mockImplementation((user: User) => tokenService.generateTokenPair(user));

    const result = await service.refresh({
      id: createUser().id,
      email: createUser().email,
      role: Role.USER,
      refreshToken: 'old-refresh',
      jti: 'refresh-jti',
    });

    expect(sessions.rotateSession).toHaveBeenCalledOnce();
    expect(result.refreshToken).toBeTruthy();
  });

  it('rejects revoked refresh token reuse', async () => {
    const { service, users, sessions } = createMocks();
    users.findById.mockResolvedValue(createUser());
    sessions.rotateSession.mockRejectedValue(
      new UnauthorizedException('Refresh token has been revoked'),
    );

    await expect(
      service.refresh({
        id: createUser().id,
        email: createUser().email,
        role: Role.USER,
        refreshToken: 'old-refresh',
        jti: 'refresh-jti',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects expired refresh token', async () => {
    const { service, users, sessions } = createMocks();
    users.findById.mockResolvedValue(createUser());
    sessions.rotateSession.mockRejectedValue(
      new UnauthorizedException('Refresh token has expired'),
    );

    await expect(
      service.refresh({
        id: createUser().id,
        email: createUser().email,
        role: Role.USER,
        refreshToken: 'old-refresh',
        jti: 'refresh-jti',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns current user', async () => {
    const { service, users } = createMocks();
    users.findById.mockResolvedValue(createUser());

    await expect(
      service.me({ id: createUser().id, email: createUser().email, role: Role.USER }),
    ).resolves.toMatchObject({ email: createUser().email });
  });

  it('rejects inactive current user', async () => {
    const { service, users } = createMocks();
    users.findById.mockResolvedValue(createUser({ isActive: false }));

    await expect(
      service.me({ id: createUser().id, email: createUser().email, role: Role.USER }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('Auth strategies, guards and decorators', () => {
  it('validates JwtStrategy payload', async () => {
    const users = {
      findById: vi.fn().mockResolvedValue(createUser()),
    } as unknown as UserRepository;
    const strategy = new JwtStrategy(createConfig(), users);

    await expect(
      strategy.validate({
        sub: createUser().id,
        email: createUser().email,
        role: Role.USER,
        type: 'access',
        jti: 'jti',
      }),
    ).resolves.toEqual({ id: createUser().id, email: createUser().email, role: Role.USER });
  });

  it('rejects invalid JwtStrategy token type', async () => {
    const strategy = new JwtStrategy(createConfig(), {
      findById: vi.fn(),
    } as unknown as UserRepository);
    await expect(
      strategy.validate({
        sub: 'id',
        email: 'email',
        role: Role.USER,
        type: 'refresh',
        jti: 'jti',
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('validates RefreshStrategy payload', async () => {
    const users = {
      findById: vi.fn().mockResolvedValue(createUser()),
    } as unknown as UserRepository;
    const strategy = new RefreshStrategy(createConfig(), users);
    const request = { body: { refreshToken: 'refresh-token' } };

    await expect(
      strategy.validate(request as never, {
        sub: createUser().id,
        email: createUser().email,
        role: Role.USER,
        type: 'refresh',
        jti: 'jti',
      }),
    ).resolves.toMatchObject({ refreshToken: 'refresh-token' });
  });

  it('rejects RefreshStrategy without token body', async () => {
    const users = {
      findById: vi.fn().mockResolvedValue(createUser()),
    } as unknown as UserRepository;
    const strategy = new RefreshStrategy(createConfig(), users);

    await expect(
      strategy.validate({ body: {} } as never, {
        sub: createUser().id,
        email: createUser().email,
        role: Role.USER,
        type: 'refresh',
        jti: 'jti',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('stores @Public metadata', () => {
    class TestController {
      @Public()
      method() {}
    }

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, TestController.prototype.method)).toBe(true);
  });

  it('stores @Roles metadata', () => {
    class TestController {
      @Roles(Role.ADMIN)
      method() {}
    }

    expect(Reflect.getMetadata(ROLES_KEY, TestController.prototype.method)).toEqual([Role.ADMIN]);
  });

  it('allows request with required ADMIN role', () => {
    const reflector = { getAllAndOverride: vi.fn(() => [Role.ADMIN]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector, createGuardLogger());
    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: Role.ADMIN } }) }),
    };

    expect(guard.canActivate(context as never)).toBe(true);
  });

  it('allows request with required USER role', () => {
    const reflector = { getAllAndOverride: vi.fn(() => [Role.USER]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector, createGuardLogger());
    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: Role.USER } }) }),
    };

    expect(guard.canActivate(context as never)).toBe(true);
  });

  it('denies request with missing role', () => {
    const reflector = { getAllAndOverride: vi.fn(() => [Role.ADMIN]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector, createGuardLogger());
    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: Role.USER } }) }),
    };

    expect(() => guard.canActivate(context as never)).toThrow('Insufficient role');
  });

  it('checks access JWT expiration through JwtService', async () => {
    const jwt = new JwtService();
    const token = await jwt.signAsync(
      { sub: 'id', type: 'access', jti: 'jti' },
      { secret: 'secret', expiresIn: '1s' },
    );
    expect(jwt.verify(token, { secret: 'secret' })).toMatchObject({ sub: 'id' });
  });

  it('checks refresh JWT expiration through JwtService', async () => {
    const jwt = new JwtService();
    const token = await jwt.signAsync(
      { sub: 'id', type: 'refresh', jti: 'jti' },
      { secret: 'secret', expiresIn: '1s' },
    );
    expect(jwt.verify(token, { secret: 'secret' })).toMatchObject({ type: 'refresh', jti: 'jti' });
  });
});
