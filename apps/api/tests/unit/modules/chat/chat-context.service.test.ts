import { PreconditionFailedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatContextService } from '../../../../src/modules/chat/services/chat-context.service';

const context = {
  id: 'project-1',
  name: 'Reviewsha',
  description: 'Code review',
  language: 'TypeScript',
  lastAnalysisAt: new Date(),
  scans: [
    {
      id: 'scan-1',
      finishedAt: new Date(),
      analysisContext: { metadata: { type: 'nestjs' }, cacheKey: 'cache-1' },
      report: {
        id: 'report-1',
        score: 87,
        summary: 'Good',
        createdAt: new Date(),
        findings: [
          {
            severity: 'HIGH',
            category: 'SECURITY',
            title: 'JWT',
            description: 'Weak validation',
            filePath: 'src/auth.ts',
            line: 10,
            recommendation: 'Validate issuer',
          },
        ],
      },
    },
  ],
};

describe('ChatContextService', () => {
  const repository = { latestContext: vi.fn() };
  const config = { get: vi.fn((_key: string, fallback: number) => fallback) };
  const secrets = { redact: vi.fn((value: string) => value) };
  const cached = new Map<string, unknown>();
  const cache = {
    get: vi.fn(async (key: string) => cached.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => void cached.set(key, value)),
    clear: vi.fn(async (projectId?: string) => {
      if (!projectId) cached.clear();
      else for (const key of cached.keys()) if (key.startsWith(`${projectId}:`)) cached.delete(key);
    }),
  };
  let service: ChatContextService;

  beforeEach(() => {
    vi.clearAllMocks();
    cached.clear();
    repository.latestContext.mockResolvedValue(structuredClone(context));
    service = new ChatContextService(
      repository as never,
      config as never,
      secrets as never,
      cache as never,
    );
  });

  it.each([
    ['project name', 'Reviewsha'],
    ['language', 'TypeScript'],
    ['analysis type', 'nestjs'],
    ['report score', '87'],
    ['finding title', 'JWT'],
    ['finding file', 'src/auth.ts'],
    ['recommendation', 'Validate issuer'],
  ])('includes %s in context', async (_label, value) => {
    expect((await service.build('project-1')).text).toContain(value);
  });

  it('computes an approximate token count', async () => {
    const result = await service.build('project-1');
    expect(result.tokens).toBe(Math.ceil(result.text.length / 4));
  });

  it('computes a stable SHA-256 cache key', async () => {
    const result = await service.build('project-1');
    expect(result.cacheKey).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('reuses a prepared context for an unchanged analysis', async () => {
    const first = await service.build('project-1');
    const second = await service.build('project-1');
    expect(second).toBe(first);
  });

  it('still checks the latest analysis before reading cache', async () => {
    await service.build('project-1');
    await service.build('project-1');
    expect(repository.latestContext).toHaveBeenCalledTimes(2);
  });

  it('clears one project cache', async () => {
    const first = await service.build('project-1');
    await service.clear('project-1');
    const second = await service.build('project-1');
    expect(second).not.toBe(first);
  });

  it('clears every cached project', async () => {
    const first = await service.build('project-1');
    await service.clear();
    const second = await service.build('project-1');
    expect(second).not.toBe(first);
  });

  it('rejects an unknown project', async () => {
    repository.latestContext.mockResolvedValue(null);
    await expect(service.build('missing')).rejects.toBeInstanceOf(PreconditionFailedException);
  });

  it.each([[] as Array<{ id: string; report: null }>, [{ id: 's1', report: null }]])(
    'rejects a project without a completed report',
    async (scans) => {
      repository.latestContext.mockResolvedValue({ ...context, scans });
      await expect(service.build('project-1')).rejects.toThrow('no completed analysis');
    },
  );

  it.each([1, 5, 20, 100])('respects a %i token context limit', async (limit) => {
    config.get.mockReturnValue(limit);
    const result = await service.build('project-1');
    expect(result.text.length).toBeLessThanOrEqual(limit * 4);
  });

  it('marks truncated context', async () => {
    config.get.mockReturnValue(40);
    expect((await service.build('project-1')).text).toContain('[context truncated]');
  });

  it('preserves full context when under the limit', async () => {
    config.get.mockReturnValue(100_000);
    expect((await service.build('project-1')).text).not.toContain('[context truncated]');
  });
});
