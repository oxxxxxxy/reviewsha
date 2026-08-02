import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ApiLoggerService } from '../../../../src/common/logger/api-logger.service';
import { ApiKeyGuard } from '../../../../src/common/auth/guards/api-key.guard';
import { JwtAuthGuard } from '../../../../src/common/auth/guards/jwt-auth.guard';
import { OwnershipGuard } from '../../../../src/common/auth/guards/ownership.guard';
import { RefreshAuthGuard } from '../../../../src/common/auth/guards/refresh-auth.guard';
import { RolesGuard } from '../../../../src/common/auth/guards/roles.guard';
import { Ownership } from '../../../../src/common/auth/decorators/ownership.decorator';
import { OWNERSHIP_KEY } from '../../../../src/common/auth/constants/ownership.constants';
import { Public } from '../../../../src/common/auth/decorators/public.decorator';
import { IS_PUBLIC_KEY } from '../../../../src/common/auth/constants/auth.constants';
import { TokenService } from '../../../../src/modules/auth/services/token.service';

function logger(): ApiLoggerService {
  return { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as ApiLoggerService;
}

function config(): ConfigService {
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
    get: vi.fn((key: string) => (key === 'security.internalApiKey' ? 'internal-key' : undefined)),
  } as unknown as ConfigService;
}

function httpContext(request: Record<string, unknown>, metadata?: unknown) {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
    metadata,
  };
}

describe('common auth guards', () => {
  it('skips JwtAuthGuard for @Public endpoints', async () => {
    const guard = new JwtAuthGuard(
      {} as TokenService,
      { findById: vi.fn() } as never,
      { getAllAndOverride: vi.fn(() => true) } as unknown as Reflector,
      logger(),
    );

    await expect(guard.canActivate(httpContext({}) as never)).resolves.toBe(true);
  });

  it('authenticates bearer access token and attaches user', async () => {
    const tokenService = new TokenService(new JwtService(), config(), logger());
    const token = await tokenService.generateAccessToken({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'user@reviewsha.local',
      role: Role.USER,
    });
    const request = { headers: { authorization: `Bearer ${token}` } };
    const guard = new JwtAuthGuard(
      tokenService,
      {
        findById: vi.fn(() => ({
          id: '00000000-0000-4000-8000-000000000001',
          email: 'user@reviewsha.local',
          role: Role.USER,
          isActive: true,
        })),
      } as never,
      { getAllAndOverride: vi.fn(() => false) } as unknown as Reflector,
      logger(),
    );

    await expect(guard.canActivate(httpContext(request) as never)).resolves.toBe(true);
    expect(request).toHaveProperty('user');
  });

  it('rejects private endpoint without bearer token', async () => {
    const guard = new JwtAuthGuard(
      {} as TokenService,
      { findById: vi.fn() } as never,
      { getAllAndOverride: vi.fn(() => false) } as unknown as Reflector,
      logger(),
    );

    await expect(guard.canActivate(httpContext({ headers: {} }) as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('authenticates refresh token from body', async () => {
    const tokenService = new TokenService(new JwtService(), config(), logger());
    const token = await tokenService.generateRefreshToken({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'user@reviewsha.local',
      role: Role.USER,
    });
    const request = { body: { refreshToken: token } };
    const guard = new RefreshAuthGuard(tokenService, {
      findById: vi.fn(() => ({
        id: '00000000-0000-4000-8000-000000000001',
        email: 'user@reviewsha.local',
        role: Role.USER,
        isActive: true,
      })),
    } as never);

    await expect(guard.canActivate(httpContext(request) as never)).resolves.toBe(true);
    expect(request).toHaveProperty('user');
  });

  it('allows matching roles', () => {
    const guard = new RolesGuard(
      { getAllAndOverride: vi.fn(() => [Role.ADMIN]) } as unknown as Reflector,
      logger(),
    );

    expect(guard.canActivate(httpContext({ user: { id: '1', role: Role.ADMIN } }) as never)).toBe(
      true,
    );
  });

  it('denies missing roles', () => {
    const guard = new RolesGuard(
      { getAllAndOverride: vi.fn(() => [Role.ADMIN]) } as unknown as Reflector,
      logger(),
    );

    expect(() =>
      guard.canActivate(httpContext({ user: { id: '1', role: Role.USER } }) as never),
    ).toThrow(ForbiddenException);
  });

  it('stores ownership metadata', () => {
    class Controller {
      @Ownership('project', 'projectId')
      handler() {}
    }

    expect(Reflect.getMetadata(OWNERSHIP_KEY, Controller.prototype.handler)).toEqual({
      resource: 'project',
      paramName: 'projectId',
    });
  });

  it('denies ownership when checker is not configured', () => {
    const guard = new OwnershipGuard(
      {
        getAllAndOverride: vi.fn(() => ({ resource: 'project', paramName: 'projectId' })),
      } as never,
      logger(),
    );

    expect(() =>
      guard.canActivate(
        httpContext({ user: { id: '1', role: Role.USER }, params: { projectId: '2' } }) as never,
      ),
    ).toThrow(ForbiddenException);
  });

  it('authenticates internal API key', () => {
    const guard = new ApiKeyGuard(config(), logger());

    expect(
      guard.canActivate(
        httpContext({
          header: (name: string) => (name === 'x-api-key' ? 'internal-key' : undefined),
        }) as never,
      ),
    ).toBe(true);
  });

  it('rejects invalid internal API key', () => {
    const guard = new ApiKeyGuard(config(), logger());

    expect(() => guard.canActivate(httpContext({ header: () => 'wrong' }) as never)).toThrow(
      UnauthorizedException,
    );
  });

  it('stores public metadata', () => {
    class Controller {
      @Public()
      handler() {}
    }

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, Controller.prototype.handler)).toBe(true);
  });
});
