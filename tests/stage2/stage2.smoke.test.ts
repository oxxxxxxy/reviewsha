import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { QUEUE_NAME_LIST, STORAGE_BUCKETS } from '@reviewsha/config';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Stage 2 smoke checks', () => {
  it('detects all required Yarn workspaces', () => {
    const workspaces = JSON.parse(
      execFileSync('yarn', ['workspaces', 'info', '--json'], { encoding: 'utf8' }).trim(),
    );

    expect(Object.keys(workspaces).sort()).toEqual([
      '@reviewsha/admin',
      '@reviewsha/api',
      '@reviewsha/config',
      '@reviewsha/sdk',
      '@reviewsha/types',
      '@reviewsha/ui',
      '@reviewsha/web',
      '@reviewsha/worker',
    ]);
  });

  it('has API health endpoint implementation', () => {
    expect(read('apps/api/src/health/health.service.ts')).toContain("status: 'ok'");
    expect(read('apps/api/src/health/health.controller.ts')).toContain('@Get()');
  });

  it('has Swagger and OpenAPI endpoints configured', () => {
    const main = read('apps/api/src/main.ts');

    expect(main).toContain('SwaggerModule.setup');
    expect(main).toContain('docs-json');
  });

  it('has web app bootstrap, router and layout', () => {
    expect(read('apps/web/src/app/app.tsx')).toContain('AppRouter');
    expect(read('apps/web/src/app/router.tsx')).toContain('/dashboard');
    expect(existsSync(join(root, 'apps/web/src/layouts/AppLayout.tsx'))).toBe(true);
  });

  it('has admin app bootstrap and required routes', () => {
    const router = read('apps/admin/src/app/router.tsx');

    for (const route of [
      '/login',
      '/dashboard',
      '/users',
      '/projects',
      '/queues',
      '/logs',
      '/settings',
    ]) {
      expect(router).toContain(route);
    }
  });

  it('has worker bootstrap without HTTP server', () => {
    const main = read('apps/worker/src/main.ts');

    expect(main).toContain('createApplicationContext');
    expect(main).not.toContain('listen(');
  });

  it('registers all MVP queue names', () => {
    expect(QUEUE_NAME_LIST).toEqual([
      'scan.queue',
      'file.queue',
      'ai.queue',
      'report.queue',
      'notification.queue',
    ]);
  });

  it('defines Docker Compose services with healthchecks', () => {
    const compose = read('docker-compose.yml');

    for (const service of ['postgres:', 'redis:', 'minio:']) {
      expect(compose).toContain(service);
    }

    expect(compose.match(/healthcheck:/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('prepares required MinIO buckets', () => {
    expect(Object.values(STORAGE_BUCKETS)).toEqual(
      expect.arrayContaining(['projects', 'reports', 'temp', 'exports', 'avatars']),
    );
    expect(read('docker-compose.yml')).toContain('MINIO_BUCKET_PROJECTS');
    expect(read('docker-compose.yml')).toContain('MINIO_BUCKET_AVATARS');
  });

  it('has GitHub Actions CI workflow', () => {
    const workflow = read('.github/workflows/ci.yml');

    expect(workflow).toContain('pull_request');
    expect(workflow).toContain('workflow_dispatch');
    expect(workflow).toContain('yarn typecheck');
    expect(workflow).toContain('docker compose config');
  });
});
