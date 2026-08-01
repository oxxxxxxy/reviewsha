import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';

const root = process.cwd();
const databaseName = 'reviewsha_stage31_test';
const databaseUrl = `postgresql://reviewsha:reviewsha@localhost:5432/${databaseName}?schema=public`;
const commandEnv = { ...process.env, DATABASE_URL: databaseUrl };
const migrationDir = join(root, 'apps/api/prisma/migrations');

function createPrismaClient(): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

function run(command: string, args: string[], cwd = root): string {
  return execFileSync(command, args, {
    cwd,
    env: commandEnv,
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

describe('Stage 3.1 Prisma infrastructure', () => {
  beforeAll(() => {
    execFileSync('docker', ['compose', 'up', '-d', 'postgres'], { cwd: root, stdio: 'inherit' });
    dockerExec(['dropdb', '-U', 'reviewsha', '--if-exists', databaseName]);
    dockerExec(['createdb', '-U', 'reviewsha', databaseName]);
  }, 60_000);

  afterAll(() => {
    dockerExec(['dropdb', '-U', 'reviewsha', '--if-exists', databaseName]);
  }, 30_000);

  it('validates Prisma schema', () => {
    expect(run('yarn', ['workspace', '@reviewsha/api', 'prisma:validate'])).toContain('valid');
  });

  it('formats Prisma schema', () => {
    expect(run('yarn', ['workspace', '@reviewsha/api', 'prisma:format'])).toContain('Formatted');
  });

  it('generates Prisma Client', () => {
    expect(run('yarn', ['workspace', '@reviewsha/api', 'prisma:generate'])).toContain(
      'Generated Prisma Client',
    );
  });

  it('contains the first migration under version control', () => {
    expect(existsSync(migrationDir)).toBe(true);
    expect(run('find', [migrationDir, '-name', 'migration.sql'])).toContain('migration.sql');
  });

  it('applies migrations to an empty PostgreSQL database', () => {
    expect(run('yarn', ['workspace', '@reviewsha/api', 'prisma:deploy'])).toContain(
      'The following migration(s) have been applied',
    );
  });

  it('runs seed idempotently', () => {
    expect(run('yarn', ['workspace', '@reviewsha/api', 'prisma:seed'])).toContain('Seed completed');
    expect(run('yarn', ['workspace', '@reviewsha/api', 'prisma:seed'])).toContain('Seed completed');
  });

  it('connects to PostgreSQL through Prisma Client', async () => {
    const prisma = createPrismaClient();
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toEqual([{ '?column?': 1 }]);
    await prisma.$disconnect();
  });

  it('performs CRUD for User model', async () => {
    const prisma = createPrismaClient();
    const email = 'crud-stage31@reviewsha.local';

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
