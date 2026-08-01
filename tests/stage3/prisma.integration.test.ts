import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, QueueStatus, Role, ScanStatus } from '@prisma/client';
import { PrismaService } from '../../apps/api/src/database/prisma.service';

vi.setConfig({ hookTimeout: 120_000, testTimeout: 60_000 });

const root = process.cwd();
const postgresUser = 'reviewsha';
const prismaSchemaPath = join(root, 'apps/api/prisma/schema.prisma');
const migrationDir = join(root, 'apps/api/prisma/migrations');
const testDatabases = [
  'reviewsha_stage31_test',
  'reviewsha_stage32_dev_test',
  'reviewsha_stage32_deploy_test',
  'reviewsha_stage32_reset_test',
  'reviewsha_stage32_seed_test',
  'reviewsha_stage33_seed_test',
];

function databaseUrl(databaseName: string): string {
  return `postgresql://reviewsha:reviewsha@localhost:5432/${databaseName}?schema=public`;
}

function createPrismaClient(databaseName = testDatabases[0]): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl(databaseName) }),
  });
}

function run(command: string, args: string[], databaseName = testDatabases[0], cwd = root): string {
  return execFileSync(command, args, {
    cwd,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl(databaseName),
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION:
        'Проверить yarn workspace @reviewsha/api prisma:reset на тестовой базе Stage 3.2',
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function dockerExec(args: string[]): string {
  return execFileSync('docker', ['exec', 'reviewsha-postgres', ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function dockerInspect(args: string[]): string {
  return execFileSync('docker', ['inspect', ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function retryPostgresAdmin(command: () => void): void {
  const deadline = Date.now() + 60_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      waitForPostgres();
      command();
      return;
    } catch (error) {
      lastError = error;
      sleep(1_000);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('PostgreSQL admin command failed');
}

function waitForPostgres(): void {
  const deadline = Date.now() + 90_000;
  let lastError: unknown;
  let stableChecks = 0;

  while (Date.now() < deadline) {
    try {
      const health = dockerInspect([
        '-f',
        '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}',
        'reviewsha-postgres',
      ]);
      dockerExec(['pg_isready', '-U', postgresUser, '-d', postgresUser]);
      dockerExec([
        'psql',
        '-U',
        postgresUser,
        '-d',
        'postgres',
        '-v',
        'ON_ERROR_STOP=1',
        '-c',
        'SELECT 1;',
      ]);

      if (health === 'healthy' || health === 'none') {
        stableChecks += 1;
      } else {
        stableChecks = 0;
      }

      if (stableChecks >= 3) {
        return;
      }
    } catch (error) {
      lastError = error;
      stableChecks = 0;
    }

    sleep(1_000);
  }

  throw lastError instanceof Error ? lastError : new Error('PostgreSQL did not become ready');
}

function terminateDatabaseConnections(databaseName: string): void {
  retryPostgresAdmin(() =>
    dockerExec([
      'psql',
      '-U',
      postgresUser,
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${databaseName}';`,
    ]),
  );
}

function recreateDatabase(databaseName: string): void {
  terminateDatabaseConnections(databaseName);
  retryPostgresAdmin(() => dockerExec(['dropdb', '-U', postgresUser, '--if-exists', databaseName]));
  retryPostgresAdmin(() => dockerExec(['createdb', '-U', postgresUser, databaseName]));
}

describe('Stage 3 Prisma schema and migration infrastructure', () => {
  beforeAll(() => {
    execFileSync('docker', ['compose', 'up', '-d', 'postgres'], { cwd: root, stdio: 'inherit' });
    waitForPostgres();

    for (const databaseName of testDatabases) {
      recreateDatabase(databaseName);
    }
  }, 60_000);

  afterAll(() => {
    for (const databaseName of testDatabases) {
      try {
        dockerExec(['dropdb', '-U', postgresUser, '--if-exists', databaseName]);
      } catch {
        // Cleanup is best-effort: the next run recreates all dedicated test databases.
      }
    }
  }, 10_000);

  it('formats Prisma schema', () => {
    expect(run('yarn', ['workspace', '@reviewsha/api', 'prisma:format'])).toContain('Formatted');
  });

  it('validates Prisma schema', () => {
    expect(run('yarn', ['workspace', '@reviewsha/api', 'prisma:validate'])).toContain('valid');
  });

  it('generates Prisma Client', () => {
    expect(run('yarn', ['workspace', '@reviewsha/api', 'prisma:generate'])).toContain(
      'Generated Prisma Client',
    );
  });

  it('contains the initial Prisma Migrate structure under version control', () => {
    expect(existsSync(prismaSchemaPath)).toBe(true);
    expect(existsSync(migrationDir)).toBe(true);
    expect(existsSync(join(migrationDir, 'migration_lock.toml'))).toBe(true);
    expect(run('find', [migrationDir, '-name', 'migration.sql'])).toContain('migration.sql');
  });

  it('runs prisma migrate dev against an empty local database', () => {
    const output = run(
      'yarn',
      ['workspace', '@reviewsha/api', 'prisma:migrate'],
      'reviewsha_stage32_dev_test',
    );

    expect(output).toMatch(/database is now in sync|Already in sync/i);
  }, 60_000);

  it('runs prisma migrate deploy against a clean database', () => {
    const output = run(
      'yarn',
      ['workspace', '@reviewsha/api', 'prisma:deploy'],
      'reviewsha_stage32_deploy_test',
    );

    expect(output).toMatch(/migration\(s\) have been applied|No pending migrations/i);
  }, 60_000);

  it('keeps prisma migrate deploy idempotent after migrations are applied', () => {
    const output = run(
      'yarn',
      ['workspace', '@reviewsha/api', 'prisma:deploy'],
      'reviewsha_stage32_deploy_test',
    );

    expect(output).toContain('No pending migrations');
  }, 60_000);

  it('runs prisma migrate reset and executes seed after reset', async () => {
    const output = run(
      'yarn',
      ['workspace', '@reviewsha/api', 'prisma:reset'],
      'reviewsha_stage32_reset_test',
    );
    const prisma = createPrismaClient('reviewsha_stage32_reset_test');

    const [admin, user, project] = await Promise.all([
      prisma.user.findUnique({ where: { email: 'admin@reviewsha.local' } }),
      prisma.user.findUnique({ where: { email: 'developer@reviewsha.local' } }),
      prisma.project.findUnique({ where: { id: '00000000-0000-4000-8000-000000000101' } }),
    ]);

    await prisma.$disconnect();

    expect(output).toContain('Database reset successful');
    expect(output).toContain('Seed completed');
    expect(admin?.role).toBe(Role.ADMIN);
    expect(user?.role).toBe(Role.USER);
    expect(project?.name).toBe('NestJS API');
  }, 60_000);

  it('runs seed idempotently without duplicating critical records', async () => {
    run('yarn', ['workspace', '@reviewsha/api', 'prisma:deploy'], 'reviewsha_stage32_seed_test');
    expect(
      run('yarn', ['workspace', '@reviewsha/api', 'prisma:seed'], 'reviewsha_stage32_seed_test'),
    ).toContain('Seed completed');
    expect(
      run('yarn', ['workspace', '@reviewsha/api', 'prisma:seed'], 'reviewsha_stage32_seed_test'),
    ).toContain('Seed completed');

    const prisma = createPrismaClient('reviewsha_stage32_seed_test');
    const [adminCount, userCount, projectCount] = await Promise.all([
      prisma.user.count({ where: { email: 'admin@reviewsha.local' } }),
      prisma.user.count({ where: { email: 'developer@reviewsha.local' } }),
      prisma.project.count({ where: { id: '00000000-0000-4000-8000-000000000101' } }),
    ]);
    await prisma.$disconnect();

    expect(adminCount).toBe(1);
    expect(userCount).toBe(1);
    expect(projectCount).toBe(1);
  }, 60_000);

  it('connects through PrismaService and supports health checks plus transactions', async () => {
    run('yarn', ['workspace', '@reviewsha/api', 'prisma:deploy']);
    const service = new PrismaService(
      {
        get: (_key: string, fallback?: unknown) => fallback,
        getOrThrow: () => databaseUrl(testDatabases[0]),
      } as never,
      { log: () => undefined } as never,
    );

    await service.onModuleInit();
    await expect(service.healthCheck()).resolves.toBeUndefined();

    const [result] = await service.$transaction([service.$queryRaw`SELECT 1`]);
    expect(result).toEqual([{ '?column?': 1 }]);

    await service.onModuleDestroy();
  });

  it('connects to PostgreSQL through Prisma Client', async () => {
    run('yarn', ['workspace', '@reviewsha/api', 'prisma:deploy']);
    const prisma = createPrismaClient();
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toEqual([{ '?column?': 1 }]);
    await prisma.$disconnect();
  });

  it('creates the deterministic seed users', async () => {
    run('yarn', ['workspace', '@reviewsha/api', 'prisma:deploy'], 'reviewsha_stage33_seed_test');
    run('yarn', ['workspace', '@reviewsha/api', 'prisma:seed'], 'reviewsha_stage33_seed_test');

    const prisma = createPrismaClient('reviewsha_stage33_seed_test');
    const [admin, developer, demo] = await Promise.all([
      prisma.user.findUnique({ where: { email: 'admin@reviewsha.local' } }),
      prisma.user.findUnique({ where: { email: 'developer@reviewsha.local' } }),
      prisma.user.findUnique({ where: { email: 'demo@reviewsha.local' } }),
    ]);
    await prisma.$disconnect();

    expect(admin?.role).toBe(Role.ADMIN);
    expect(developer?.role).toBe(Role.USER);
    expect(demo?.role).toBe(Role.USER);
    expect(admin?.passwordHash).toMatch(/^sha256:/);
  });

  it('creates realistic demo projects', async () => {
    const prisma = createPrismaClient('reviewsha_stage33_seed_test');
    const projects = await prisma.project.findMany({ orderBy: { name: 'asc' } });
    await prisma.$disconnect();

    expect(projects.map((project) => project.name)).toEqual([
      'Linux Scripts',
      'NestJS API',
      'React Dashboard',
    ]);
  });

  it('keeps User to Project ownership relations valid', async () => {
    const prisma = createPrismaClient('reviewsha_stage33_seed_test');
    const developer = await prisma.user.findUnique({
      where: { email: 'developer@reviewsha.local' },
      include: { ownedProjects: true, projectMemberships: true },
    });
    await prisma.$disconnect();

    expect(developer?.ownedProjects.length).toBeGreaterThanOrEqual(2);
    expect(developer?.projectMemberships.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps Project to Scan to Report relations valid', async () => {
    const prisma = createPrismaClient('reviewsha_stage33_seed_test');
    const project = await prisma.project.findUnique({
      where: { id: '00000000-0000-4000-8000-000000000101' },
      include: { scans: { include: { report: true } } },
    });
    await prisma.$disconnect();

    expect(project?.scans).toHaveLength(1);
    expect(project?.scans[0]?.status).toBe(ScanStatus.COMPLETED);
    expect(project?.scans[0]?.report?.score).toBe(82);
  });

  it('creates uploaded files, findings, chats and queue jobs for UI development', async () => {
    const prisma = createPrismaClient('reviewsha_stage33_seed_test');
    const [uploadedFiles, findings, chatMessages, queueJobs] = await Promise.all([
      prisma.uploadedFile.count(),
      prisma.finding.count(),
      prisma.chatMessage.count(),
      prisma.queueJob.findMany({ select: { status: true } }),
    ]);
    await prisma.$disconnect();

    expect(uploadedFiles).toBeGreaterThanOrEqual(3);
    expect(findings).toBeGreaterThanOrEqual(24);
    expect(chatMessages).toBeGreaterThanOrEqual(4);
    expect(queueJobs.map((job) => job.status)).toEqual(
      expect.arrayContaining([
        QueueStatus.WAITING,
        QueueStatus.ACTIVE,
        QueueStatus.COMPLETED,
        QueueStatus.FAILED,
      ]),
    );
  });

  it('keeps the minimum expected seed dataset size stable', async () => {
    const prisma = createPrismaClient('reviewsha_stage33_seed_test');
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.uploadedFile.count(),
      prisma.scan.count(),
      prisma.report.count(),
      prisma.finding.count(),
      prisma.chatSession.count(),
      prisma.chatMessage.count(),
      prisma.queueJob.count(),
    ]);
    await prisma.$disconnect();

    expect(counts).toEqual([3, 3, 3, 3, 1, 24, 1, 4, 4]);
  });

  it('performs CRUD for User model after migrations are applied', async () => {
    const prisma = createPrismaClient();
    const email = 'crud-stage3@reviewsha.local';

    await prisma.user.deleteMany({ where: { email } });
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash: 'sha256:test',
        displayName: 'CRUD User',
        role: Role.USER,
      },
    });
    const updated = await prisma.user.update({
      where: { id: created.id },
      data: { displayName: 'Updated CRUD User' },
    });
    await prisma.user.delete({ where: { id: created.id } });

    expect(updated.displayName).toBe('Updated CRUD User');
    await expect(prisma.user.findUnique({ where: { id: created.id } })).resolves.toBeNull();
    await prisma.$disconnect();
  });
});
