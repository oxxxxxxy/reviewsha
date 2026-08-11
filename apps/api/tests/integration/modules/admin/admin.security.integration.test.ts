import 'reflect-metadata';

import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RolesGuard } from '../../../../src/common/auth/guards/roles.guard';
import { ApiLoggerService } from '../../../../src/common/logger/api-logger.service';
import { AdminController } from '../../../../src/modules/admin/admin.controller';
import { AdminService } from '../../../../src/modules/admin/admin.service';

class TestJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string }; user?: object }>();
    const token = request.headers.authorization?.replace('Bearer ', '');
    request.user = {
      id: '00000000-0000-4000-8000-000000000001',
      role: token === 'admin-token' ? Role.ADMIN : Role.USER,
    };
    return true;
  }
}

const adminService = {
  overview: vi.fn(async () => ({})),
  userDetails: vi.fn(async () => ({})),
  users: vi.fn(async () => ({})),
  updateUser: vi.fn(async () => ({})),
  projectDetails: vi.fn(async () => ({})),
  projects: vi.fn(async () => ({})),
  queueOverview: vi.fn(async () => ({})),
  aiUsage: vi.fn(async () => ({})),
  aiUsageBreakdown: vi.fn(async () => ({})),
  statistics: vi.fn(async () => ({})),
  logs: vi.fn(async () => ({})),
  log: vi.fn(async () => ({})),
  queueJobs: vi.fn(async () => ({})),
  queueJob: vi.fn(async () => ({})),
  retryJob: vi.fn(async () => ({})),
  removeJob: vi.fn(async () => ({})),
};

const adminPaths = [
  { method: 'get', path: '/api/v1/admin/overview' },
  { method: 'get', path: '/api/v1/admin/users/00000000-0000-4000-8000-000000000002/details' },
  { method: 'get', path: '/api/v1/admin/users' },
  { method: 'get', path: '/api/v1/admin/users/00000000-0000-4000-8000-000000000002' },
  { method: 'patch', path: '/api/v1/admin/users/00000000-0000-4000-8000-000000000002' },
  { method: 'get', path: '/api/v1/admin/projects/00000000-0000-4000-8000-000000000002/details' },
  { method: 'get', path: '/api/v1/admin/projects' },
  { method: 'get', path: '/api/v1/admin/projects/00000000-0000-4000-8000-000000000002' },
  { method: 'get', path: '/api/v1/admin/queues' },
  { method: 'get', path: '/api/v1/admin/ai-usage' },
  { method: 'get', path: '/api/v1/admin/ai-usage/breakdown' },
  { method: 'get', path: '/api/v1/admin/statistics' },
  { method: 'get', path: '/api/v1/admin/logs' },
  { method: 'get', path: '/api/v1/admin/logs/00000000-0000-4000-8000-000000000002' },
  { method: 'get', path: '/api/v1/admin/queues/scan.queue/jobs' },
  { method: 'get', path: '/api/v1/admin/queues/scan.queue/jobs/job-1' },
  { method: 'post', path: '/api/v1/admin/queues/scan.queue/jobs/job-1/retry' },
  { method: 'delete', path: '/api/v1/admin/queues/scan.queue/jobs/job-1' },
] as const;

describe('Admin HTTP authorization matrix', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
        { provide: ApiLoggerService, useValue: { log: vi.fn(), warn: vi.fn() } },
        { provide: APP_GUARD, useClass: TestJwtGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it.each(adminPaths)('$method $path rejects USER and allows ADMIN', async ({ method, path }) => {
    const userRequest = request(app.getHttpServer())
      [method](path)
      .set('Authorization', 'Bearer user-token');
    await userRequest.expect(403);

    const adminRequest = request(app.getHttpServer())
      [method](path)
      .set('Authorization', 'Bearer admin-token');
    await adminRequest.expect((response) => {
      expect(response.status).not.toBe(403);
      expect(response.status).not.toBe(401);
    });
  });
});
