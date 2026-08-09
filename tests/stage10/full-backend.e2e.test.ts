import 'reflect-metadata';
import {
  ValidationPipe,
  type INestApplication,
  type INestApplicationContext,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { ZipFile } from 'yazl';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../apps/api/src/app.module';
import { PrismaService } from '../../apps/api/src/database/prisma.service';
import { WorkerModule } from '../../apps/worker/src/worker.module';
import { StorageService } from '../../apps/api/src/modules/storage/services/storage.service';

const enabled = process.env.RUN_BACKEND_E2E === 'true';

describe.runIf(enabled)('API to Worker to Report E2E', () => {
  let api: INestApplication;
  let worker: INestApplicationContext;
  let prisma: PrismaService;
  let storage: StorageService;
  let token = '';
  let otherToken = '';
  let projectId = '';
  let firstReportId = '';
  let secondReportId = '';
  let chatSessionId = '';
  let archive: Buffer;
  const email = `full-e2e-${randomUUID()}@example.com`;
  const otherEmail = `full-e2e-other-${randomUUID()}@example.com`;

  beforeAll(async () => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public',
      REDIS_URL: 'redis://localhost:6379',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: '9000',
      MINIO_ACCESS_KEY: 'reviewsha',
      MINIO_SECRET_KEY: 'reviewsha-password',
      MINIO_USE_SSL: 'false',
      WORKER_REDIS_REQUIRED: 'true',
      AI_PROVIDER: 'mock',
    });
    const apiModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    api = apiModule.createNestApplication();
    api.setGlobalPrefix('api/v1');
    api.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await api.init();
    worker = await NestFactory.createApplicationContext(WorkerModule, {
      logger: ['error', 'warn'],
      abortOnError: false,
    });
    prisma = api.get(PrismaService);
    storage = api.get(StorageService);
    archive = await zipBuffer();
  }, 30_000);

  afterAll(async () => {
    if (projectId) await prisma.project.delete({ where: { id: projectId } }).catch(() => undefined);
    await prisma?.user.deleteMany({ where: { email: { in: [email, otherEmail] } } });
    await worker?.close();
    await api?.close();
  });

  it('registers two authenticated users', async () => {
    const first = await request(api.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'strong-password-123', displayName: 'Pipeline User' })
      .expect(201);
    const second = await request(api.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: otherEmail, password: 'strong-password-123', displayName: 'Other User' })
      .expect(201);
    token = first.body.accessToken;
    otherToken = second.body.accessToken;
    expect(token).toBeTruthy();
    expect(otherToken).toBeTruthy();
  });

  it('creates an owned project with tags', async () => {
    const response = await request(api.getHttpServer())
      .post('/api/v1/projects')
      .set('authorization', `Bearer ${token}`)
      .send({ name: 'Full E2E Project', language: 'TypeScript', tags: ['e2e', 'worker'] })
      .expect(201);
    projectId = response.body.data.id;
    expect(response.body.data.tags).toEqual(['e2e', 'worker']);
  });

  it('rejects upload to another user project', async () => {
    await request(api.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .set('authorization', `Bearer ${otherToken}`)
      .attach('file', archive, { filename: 'project.zip', contentType: 'application/zip' })
      .expect(403);
  });

  it('rejects a non-ZIP upload', async () => {
    await request(api.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .set('authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('plain text'), {
        filename: 'project.txt',
        contentType: 'text/plain',
      })
      .expect(422);
  });

  it('rejects a corrupted ZIP upload', async () => {
    await request(api.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .set('authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('not a zip archive'), {
        filename: 'broken.zip',
        contentType: 'application/zip',
      })
      .expect(422);
  });

  it('uploads and versions a real ZIP in MinIO', async () => {
    const response = await request(api.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .set('authorization', `Bearer ${token}`)
      .attach('file', archive, { filename: 'project.zip', contentType: 'application/zip' })
      .expect(201);
    expect(response.body).toMatchObject({ status: 'COMPLETED', version: 3 });
    expect(response.body.checksum).toMatch(/^sha256:/);
  });

  it('persists upload metadata and object in private storage', async () => {
    const uploaded = await prisma.uploadedFile.findFirstOrThrow({
      where: { projectId, status: 'COMPLETED' },
      orderBy: { version: 'asc' },
    });
    expect(uploaded.objectKey).not.toContain(uploaded.filename);
    expect(await storage.exists('projects', uploaded.objectKey)).toBe(true);
    expect(uploaded.checksum).toMatch(/^sha256:/);
  });

  it('automatically completes Worker and AI pipeline', async () => {
    const report = await waitForReport(api, token, projectId, 1);
    firstReportId = report.id;
    expect(report).toMatchObject({ status: 'READY', score: 100 });
    expect(report.tokensUsed).toBeGreaterThan(0);
  }, 30_000);

  it('creates a report-ready notification exactly once', async () => {
    const notifications = await waitForNotifications(prisma, email, 1);
    expect(notifications).toHaveLength(1);
  });

  it.each([
    ['md', /text\/markdown/],
    ['json', /application\/json/],
    ['pdf', /application\/pdf/],
  ])('exports and persists %s report', async (format, contentType) => {
    const response = await request(api.getHttpServer())
      .get(`/api/v1/reports/${firstReportId}/export/${format}`)
      .set('authorization', `Bearer ${token}`)
      .buffer(true)
      .expect(200);
    expect(response.headers['content-type']).toMatch(contentType);
    expect(Number(response.headers['content-length'] ?? response.body.length)).toBeGreaterThan(0);
  });

  it('prevents another user from reading or exporting report', async () => {
    await request(api.getHttpServer())
      .get(`/api/v1/reports/${firstReportId}`)
      .set('authorization', `Bearer ${otherToken}`)
      .expect(403);
    await request(api.getHttpServer())
      .get(`/api/v1/reports/${firstReportId}/export/json`)
      .set('authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  it('creates version two and compares reports', async () => {
    await request(api.getHttpServer())
      .post(`/api/v1/projects/${projectId}/uploads`)
      .set('authorization', `Bearer ${token}`)
      .attach('file', archive, { filename: 'project-v2.zip', contentType: 'application/zip' })
      .expect(201)
      .expect(({ body }) => expect(body.version).toBe(4));
    const report = await waitForReport(api, token, projectId, 2);
    secondReportId = report.id;
    await request(api.getHttpServer())
      .get(`/api/v1/reports/compare?oldReportId=${firstReportId}&newReportId=${secondReportId}`)
      .set('authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ newIssues: 0, resolvedIssues: 0 }));
  }, 30_000);

  it('returns complete report details and findings collection', async () => {
    await request(api.getHttpServer())
      .get(`/api/v1/reports/${secondReportId}`)
      .set('authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('READY');
        expect(body.issues).toEqual([]);
        expect(body.recommendations).toEqual([]);
      });
  });

  it('persists AI contexts, responses, and usage for every analysis', async () => {
    const scans = await prisma.scan.findMany({ where: { projectId }, select: { id: true } });
    expect(await prisma.analysisContext.count({ where: { projectId } })).toBe(2);
    expect(
      await prisma.aIResponse.count({
        where: { request: { scanId: { in: scans.map((scan) => scan.id) } } },
      }),
    ).toBe(10);
    expect(await prisma.aIUsage.count({ where: { projectId } })).toBe(2);
    const contexts = await prisma.analysisContext.findMany({ where: { projectId } });
    expect(new Set(contexts.map((context) => context.cacheKey)).size).toBe(1);
  });

  it('returns explicit report generation status', async () => {
    await request(api.getHttpServer())
      .get(`/api/v1/reports/${secondReportId}/status`)
      .set('authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('READY'));
  });

  it('paginates report history', async () => {
    await request(api.getHttpServer())
      .get(`/api/v1/projects/${projectId}/reports?page=1&limit=1`)
      .set('authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(1);
        expect(body.meta).toMatchObject({ page: 1, limit: 1, total: 2, totalPages: 2 });
      });
  });

  it('requires JWT for report access', async () => {
    await request(api.getHttpServer()).get(`/api/v1/reports/${secondReportId}`).expect(401);
  });

  it('validates report identifiers', async () => {
    await request(api.getHttpServer())
      .get('/api/v1/reports/not-a-uuid')
      .set('authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('rejects unsupported export format', async () => {
    await request(api.getHttpServer())
      .get(`/api/v1/reports/${secondReportId}/export/xml`)
      .set('authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('supports idempotent repeated export', async () => {
    await request(api.getHttpServer())
      .get(`/api/v1/reports/${firstReportId}/export/json`)
      .set('authorization', `Bearer ${token}`)
      .expect(200);
    expect(
      await prisma.reportExport.count({
        where: { reportId: firstReportId, format: 'JSON' },
      }),
    ).toBe(1);
  });

  it('creates a project chat session', async () => {
    const response = await request(api.getHttpServer())
      .post(`/api/v1/projects/${projectId}/chat`)
      .set('authorization', `Bearer ${token}`)
      .send({ title: 'E2E review chat' })
      .expect(201);
    chatSessionId = response.body.id;
    expect(response.body).toMatchObject({ title: 'E2E review chat', messagesCount: 0 });
  });

  it('lists project chat sessions', async () => {
    await request(api.getHttpServer())
      .get(`/api/v1/projects/${projectId}/chat`)
      .set('authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.data.map((item: { id: string }) => item.id)).toContain(chatSessionId),
      );
  });

  it('requires JWT for chat access', async () => {
    await request(api.getHttpServer()).get(`/api/v1/chat/${chatSessionId}/messages`).expect(401);
  });

  it('prevents another user from reading chat history', async () => {
    await request(api.getHttpServer())
      .get(`/api/v1/chat/${chatSessionId}/messages`)
      .set('authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  it.each(['', ' ', 'x'.repeat(4001)])('rejects invalid chat message %j', async (message) => {
    await request(api.getHttpServer())
      .post(`/api/v1/chat/${chatSessionId}/messages`)
      .set('authorization', `Bearer ${token}`)
      .send({ message })
      .expect(400);
  });

  it('uses the existing AI provider to answer a chat message', async () => {
    await request(api.getHttpServer())
      .post(`/api/v1/chat/${chatSessionId}/messages`)
      .set('authorization', `Bearer ${token}`)
      .send({ message: 'Why was JWT highlighted?' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.role).toBe('ASSISTANT');
        expect(body.content).toContain('Mock Reviewsha chat response');
        expect(body.tokens).toBeGreaterThan(0);
      });
  }, 15_000);

  it('persists both sides of the conversation', async () => {
    await request(api.getHttpServer())
      .get(`/api/v1/chat/${chatSessionId}/messages`)
      .set('authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.map((item: { role: string }) => item.role)).toEqual(['USER', 'ASSISTANT']);
      });
  });

  it('paginates persisted chat history', async () => {
    await request(api.getHttpServer())
      .get(`/api/v1/chat/${chatSessionId}/messages?page=2&limit=1`)
      .set('authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => expect(body.meta).toMatchObject({ page: 2, limit: 1, total: 2 }));
  });

  it('rejects chat AI request when a project has no analysis', async () => {
    const created = await request(api.getHttpServer())
      .post('/api/v1/projects')
      .set('authorization', `Bearer ${token}`)
      .send({ name: 'No Analysis Chat Project' })
      .expect(201);
    const emptyProjectId = created.body.data.id;
    const chatResponse = await request(api.getHttpServer())
      .post(`/api/v1/projects/${emptyProjectId}/chat`)
      .set('authorization', `Bearer ${token}`)
      .send({})
      .expect(201);
    await request(api.getHttpServer())
      .post(`/api/v1/chat/${chatResponse.body.id}/messages`)
      .set('authorization', `Bearer ${token}`)
      .send({ message: 'What did the analysis find?' })
      .expect(412);
    await prisma.project.delete({ where: { id: emptyProjectId } });
  });

  it('streams chat response over SSE', async () => {
    await request(api.getHttpServer())
      .post(`/api/v1/chat/${chatSessionId}/stream`)
      .set('authorization', `Bearer ${token}`)
      .send({ message: 'Explain src/index.ts' })
      .expect('content-type', /text\/event-stream/u)
      .expect(200)
      .expect(({ text }) => {
        expect(text).toContain('event: token');
        expect(text).toContain('event: complete');
      });
  }, 15_000);

  it('searches persisted chat history', async () => {
    await request(api.getHttpServer())
      .get(`/api/v1/chat/${chatSessionId}/messages?search=src%2Findex.ts`)
      .set('authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) =>
        expect(
          body.data.some((item: { content: string }) => item.content.includes('src/index.ts')),
        ).toBe(true),
      );
  });

  it('sorts chat history descending', async () => {
    await request(api.getHttpServer())
      .get(`/api/v1/chat/${chatSessionId}/messages?sort=desc`)
      .set('authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        const dates = body.data.map((item: { createdAt: string }) => item.createdAt);
        expect(dates).toEqual([...dates].sort().reverse());
      });
  });

  it('persists chat memory and token usage', async () => {
    const persisted = await prisma.chatSession.findUniqueOrThrow({ where: { id: chatSessionId } });
    expect(persisted.memory).toBeTruthy();
    expect(persisted.activeTopic).toContain('src/index.ts');
    expect(await prisma.chatUsage.count({ where: { sessionId: chatSessionId } })).toBe(2);
  });

  it('persists all three export formats', async () => {
    expect(await prisma.reportExport.count({ where: { reportId: firstReportId } })).toBe(3);
  });

  it('compares a report with itself without changes', async () => {
    await request(api.getHttpServer())
      .get(`/api/v1/reports/compare?oldReportId=${secondReportId}&newReportId=${secondReportId}`)
      .set('authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ scoreDiff: 0, newIssues: 0, resolvedIssues: 0 }),
      );
  });

  it('lists both upload versions', async () => {
    await request(api.getHttpServer())
      .get(`/api/v1/projects/${projectId}/uploads`)
      .set('authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.data.map((item: { version: number }) => item.version)).toEqual([4, 3, 2, 1]),
      );
  });

  it('soft-deletes report and removes stored export metadata', async () => {
    await request(api.getHttpServer())
      .delete(`/api/v1/reports/${firstReportId}`)
      .set('authorization', `Bearer ${token}`)
      .expect(204);
    await request(api.getHttpServer())
      .get(`/api/v1/reports/${firstReportId}`)
      .set('authorization', `Bearer ${token}`)
      .expect(404);
    expect(await prisma.reportExport.count({ where: { reportId: firstReportId } })).toBe(0);
  });

  it('updates project fields and tags', async () => {
    await request(api.getHttpServer())
      .patch(`/api/v1/projects/${projectId}`)
      .set('authorization', `Bearer ${token}`)
      .send({ name: 'Updated E2E Project', tags: ['updated', 'typescript'] })
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.name).toBe('Updated E2E Project');
        expect(body.data.tags).toEqual(['typescript', 'updated']);
      });
  });

  it('searches and filters owned projects', async () => {
    await request(api.getHttpServer())
      .get('/api/v1/projects?search=Updated&language=TypeScript&tags=updated&sort=name&order=asc')
      .set('authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.data.map((item: { id: string }) => item.id)).toContain(projectId),
      );
  });

  it('archives project and hides it from active list', async () => {
    await request(api.getHttpServer())
      .post(`/api/v1/projects/${projectId}/archive`)
      .set('authorization', `Bearer ${token}`)
      .expect(201)
      .expect(({ body }) => expect(body.data.status).toBe('ARCHIVED'));
    await request(api.getHttpServer())
      .get('/api/v1/projects?status=ACTIVE')
      .set('authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.data.map((item: { id: string }) => item.id)).not.toContain(projectId),
      );
  });

  it('keeps archived project readable', async () => {
    await request(api.getHttpServer())
      .get(`/api/v1/projects/${projectId}`)
      .set('authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => expect(body.data.status).toBe('ARCHIVED'));
  });

  it('restores archived project', async () => {
    await request(api.getHttpServer())
      .post(`/api/v1/projects/${projectId}/restore`)
      .set('authorization', `Bearer ${token}`)
      .expect(201)
      .expect(({ body }) => expect(body.data.status).toBe('ACTIVE'));
  });

  it('records complete project history', async () => {
    await request(api.getHttpServer())
      .get(`/api/v1/projects/${projectId}/history`)
      .set('authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        const actions = body.data.map((item: { action: string }) => item.action);
        expect(actions).toEqual(
          expect.arrayContaining([
            'CREATED',
            'UPDATED',
            'TAG_ADDED',
            'TAG_REMOVED',
            'ARCHIVED',
            'RESTORED',
          ]),
        );
      });
  });

  it('prevents another user from managing project', async () => {
    await request(api.getHttpServer())
      .patch(`/api/v1/projects/${projectId}`)
      .set('authorization', `Bearer ${otherToken}`)
      .send({ name: 'Hijacked' })
      .expect(403);
  });

  it('soft-deletes project and removes it from user API', async () => {
    await request(api.getHttpServer())
      .delete(`/api/v1/projects/${projectId}`)
      .set('authorization', `Bearer ${token}`)
      .expect(204);
    await request(api.getHttpServer())
      .get(`/api/v1/projects/${projectId}`)
      .set('authorization', `Bearer ${token}`)
      .expect(404);
  });
});

async function zipBuffer(): Promise<Buffer> {
  const archive = new ZipFile();
  archive.addBuffer(Buffer.from('{"name":"e2e-project"}\n'), 'package.json');
  archive.addBuffer(Buffer.from('export const secure = true;\n'), 'src/index.ts');
  archive.end();
  const chunks: Buffer[] = [];
  for await (const chunk of archive.outputStream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function waitForReport(
  app: INestApplication,
  accessToken: string,
  projectId: string,
  expectedCount: number,
) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/reports`)
      .set('authorization', `Bearer ${accessToken}`);
    const ready = response.body.data?.filter((item: { status: string }) => item.status === 'READY');
    if (ready?.length >= expectedCount) return ready[0];
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Report was not generated in time');
}

async function waitForNotifications(prisma: PrismaService, email: string, count: number) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const notifications = await prisma.notification.findMany({
      where: { user: { email }, type: 'REPORT_READY', message: { contains: 'complete' } },
    });
    if (notifications.length >= count) return notifications;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return [];
}
