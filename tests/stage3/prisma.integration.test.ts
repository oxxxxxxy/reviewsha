import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';

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

function dockerExec(args: string[]): void {
  execFileSync('docker', ['exec', 'reviewsha-postgres', ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function waitForPostgres(): void {
  const deadline = Date.now() + 60_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      dockerExec(['pg_isready', '-U', postgresUser, '-d', postgresUser]);
      return;
    } catch (error) {
      lastError = error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('PostgreSQL did not become ready');
}

function terminateDatabaseConnections(databaseName: string): void {
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
  ]);
}

function recreateDatabase(databaseName: string): void {
  terminateDatabaseConnections(databaseName);
  dockerExec(['dropdb', '-U', postgresUser, '--if-exists', databaseName]);
  dockerExec(['createdb', '-U', postgresUser, databaseName]);
}

function dropDatabase(databaseName: string): void {
  terminateDatabaseConnections(databaseName);
  dockerExec(['dropdb', '-U', postgresUser, '--if-exists', databaseName]);
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
      dropDatabase(databaseName);
    }
  }, 30_000);

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
      prisma.user.findUnique({ where: { email: 'user@reviewsha.local' } }),
      prisma.project.findUnique({ where: { id: '00000000-0000-4000-8000-000000000001' } }),
    ]);

    await prisma.$disconnect();

    expect(output).toContain('Database reset successful');
    expect(output).toContain('Seed completed');
    expect(admin?.role).toBe(Role.ADMIN);
    expect(user?.role).toBe(Role.USER);
    expect(project?.name).toBe('Demo Reviewsha Project');
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
      prisma.user.count({ where: { email: 'user@reviewsha.local' } }),
      prisma.project.count({ where: { id: '00000000-0000-4000-8000-000000000001' } }),
    ]);
    await prisma.$disconnect();

    expect(adminCount).toBe(1);
    expect(userCount).toBe(1);
    expect(projectCount).toBe(1);
  }, 60_000);

  it('connects to PostgreSQL through Prisma Client', async () => {
    run('yarn', ['workspace', '@reviewsha/api', 'prisma:deploy']);
    const prisma = createPrismaClient();
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toEqual([{ '?column?': 1 }]);
    await prisma.$disconnect();
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
