import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Role, type RefreshToken, type User } from '@prisma/client';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from '../../../../src/common/http-exception.filter';
import { ApiLoggerService } from '../../../../src/common/logger/api-logger.service';
import { RefreshTokenRepository } from '../../../../src/repositories/auth/refresh-token.repository';
import { UserRepository } from '../../../../src/repositories/user/user.repository';
import { AuthController } from '../../../../src/modules/auth/controllers/auth.controller';
import { AuthService } from '../../../../src/modules/auth/services/auth.service';
import { TokenService } from '../../../../src/modules/auth/services/token.service';
import { JwtStrategy } from '../../../../src/modules/auth/strategies/jwt.strategy';
import { RefreshStrategy } from '../../../../src/modules/auth/strategies/refresh.strategy';

const jwtConfig = {
  access: {
    secret: 'access-secret',
    expiresIn: '15m',
    issuer: 'reviewsha-api',
    audience: 'reviewsha-clients',
    algorithm: 'HS256' as const,
  },
  refresh: {
    secret: 'refresh-secret',
    expiresIn: '30d',
    issuer: 'reviewsha-api',
    audience: 'reviewsha-clients',
    algorithm: 'HS256' as const,
  },
};

function createState() {
  const users = new Map<string, User>();
  const refreshTokens = new Map<string, RefreshToken>();
  let userSeq = 1;
  let tokenSeq = 1;

  const userRepository = {
    findByEmail: vi.fn(
      async (email: string) => [...users.values()].find((user) => user.email === email) ?? null,
    ),
    findById: vi.fn(async (id: string) => users.get(id) ?? null),
    create: vi.fn(async (data: { email: string; passwordHash: string; displayName: string }) => {
      const user: User = {
        id: `00000000-0000-4000-8000-${String(userSeq++).padStart(12, '0')}`,
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        avatarUrl: null,
        role: Role.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      users.set(user.id, user);
      return user;
    }),
  };

  const refreshTokenRepository = {
    create: vi.fn(
      async (data: { user: { connect: { id: string } }; tokenHash: string; expiresAt: Date }) => {
        const token: RefreshToken = {
          id: `00000000-0000-4000-8001-${String(tokenSeq++).padStart(12, '0')}`,
          userId: data.user.connect.id,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          createdAt: new Date(),
          revokedAt: null,
        };
        refreshTokens.set(token.tokenHash, token);
        return token;
      },
    ),
    findByHash: vi.fn(async (tokenHash: string) => refreshTokens.get(tokenHash) ?? null),
    revoke: vi.fn(async (tokenHash: string) => {
      const token = refreshTokens.get(tokenHash);
      if (!token) {
        throw new Error('missing token');
      }
      token.revokedAt = new Date();
      return token;
    }),
    revokeAll: vi.fn(async (userId: string) => {
      let count = 0;
      for (const token of refreshTokens.values()) {
        if (token.userId === userId && !token.revokedAt) {
          token.revokedAt = new Date();
          count += 1;
        }
      }
      return { count };
    }),
  };

  return { users, refreshTokens, userRepository, refreshTokenRepository };
}

describe('AuthModule HTTP integration', () => {
  let app: INestApplication;
  let state: ReturnType<typeof createState>;
  let logger: { log: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    state = createState();
    logger = { log: vi.fn(), warn: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({})],
      controllers: [AuthController],
      providers: [
        AuthService,
        TokenService,
        JwtStrategy,
        RefreshStrategy,
        { provide: UserRepository, useValue: state.userRepository },
        { provide: RefreshTokenRepository, useValue: state.refreshTokenRepository },
        { provide: ApiLoggerService, useValue: logger },
        { provide: ConfigService, useValue: { getOrThrow: vi.fn(() => jwtConfig) } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  async function register() {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'developer@reviewsha.local',
        password: 'strong-password',
        displayName: 'Developer',
      })
      .expect(201);
    return response.body as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string };
    };
  }

  it('runs Register → Login → Me', async () => {
    await register();
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'developer@reviewsha.local', password: 'strong-password' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.email).toBe('developer@reviewsha.local'));
  });

  it('runs Login → Refresh → Me', async () => {
    const registered = await register();
    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: registered.refreshToken })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
      .expect(200);
  });

  it('logs out one refresh token', async () => {
    const registered = await register();

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${registered.accessToken}`)
      .send({ refreshToken: registered.refreshToken })
      .expect(204);

    expect([...state.refreshTokens.values()].some((token) => token.revokedAt)).toBe(true);
  });

  it('logs out all devices', async () => {
    const registered = await register();
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'developer@reviewsha.local', password: 'strong-password' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${registered.accessToken}`)
      .expect(204);

    expect([...state.refreshTokens.values()].every((token) => token.revokedAt)).toBe(true);
  });

  it('rejects reuse of old refresh token', async () => {
    const registered = await register();
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: registered.refreshToken })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: registered.refreshToken })
      .expect(401);
  });

  it('rejects private endpoint without JWT', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('allows private endpoint with valid JWT', async () => {
    const registered = await register();
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${registered.accessToken}`)
      .expect(200);
  });

  it('rejects expired JWT', async () => {
    const registered = await register();
    const jwt = app.get(JwtService);
    const expired = await jwt.signAsync(
      { sub: registered.user.id, email: registered.user.email, role: Role.USER, type: 'access' },
      {
        secret: jwtConfig.access.secret,
        expiresIn: '-1s',
        issuer: jwtConfig.access.issuer,
        audience: jwtConfig.access.audience,
      },
    );

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
  });

  it('supports ADMIN role payloads', async () => {
    const registered = await register();
    const user = state.users.get(registered.user.id);
    if (user) user.role = Role.ADMIN;
    const jwt = app.get(JwtService);
    const adminToken = await jwt.signAsync(
      { sub: registered.user.id, email: registered.user.email, role: Role.ADMIN, type: 'access' },
      {
        secret: jwtConfig.access.secret,
        expiresIn: '15m',
        issuer: jwtConfig.access.issuer,
        audience: jwtConfig.access.audience,
      },
    );

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('supports USER role payloads', async () => {
    const registered = await register();
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${registered.accessToken}`)
      .expect(200);
  });

  it('supports multiple devices', async () => {
    await register();
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'developer@reviewsha.local', password: 'strong-password' })
      .expect(200);
    expect(state.refreshTokens.size).toBe(2);
  });

  it('exposes Bearer authentication and Auth paths in Swagger', async () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    expect(document.components?.securitySchemes).toHaveProperty('bearer');
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining(['/api/v1/auth/register', '/api/v1/auth/me']),
    );
  });

  it('blocks inactive users', async () => {
    const registered = await register();
    const user = state.users.get(registered.user.id);
    if (user) user.isActive = false;

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${registered.accessToken}`)
      .expect(401);
  });

  it('rejects refresh after password change style token revocation', async () => {
    const registered = await register();
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${registered.accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: registered.refreshToken })
      .expect(401);
  });

  it('keeps refresh token hash in database after logout without storing raw token', async () => {
    const registered = await register();
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${registered.accessToken}`)
      .send({ refreshToken: registered.refreshToken })
      .expect(204);

    expect(
      [...state.refreshTokens.values()].every(
        (token) => token.tokenHash !== registered.refreshToken,
      ),
    ).toBe(true);
    expect([...state.refreshTokens.values()].some((token) => token.revokedAt)).toBe(true);
  });

  it('logs auth operations without passwords or tokens', async () => {
    await register();
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain('strong-password');
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain('eyJ');
  });
});
