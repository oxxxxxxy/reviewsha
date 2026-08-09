import { MessageRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatMemoryService } from '../../../../src/modules/chat/services/chat-memory.service';

describe('ChatMemoryService', () => {
  const repository = { messagesForMemory: vi.fn(), updateMemory: vi.fn() };
  const summaries = { summarize: vi.fn(() => 'compressed conversation') };
  let service: ChatMemoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository.messagesForMemory.mockResolvedValue([]);
    repository.updateMemory.mockResolvedValue({});
    service = new ChatMemoryService(repository as never, summaries as never);
  });

  it.each(['src/auth.ts', 'auth.service.ts', 'modules/jwt.guard.ts'])(
    'remembers discussed file %s',
    async (file) =>
      expect((await service.update('s1', `Check ${file}`, 'Done')).files).toContain(file),
  );

  it.each(['bug', 'HIGH', 'vulnerability', 'ошибка', 'уязвимость'])(
    'remembers issue term %s',
    async (term) =>
      expect((await service.update('s1', term, 'Done')).issues.length).toBeGreaterThan(0),
  );

  it.each([
    'You should validate JWT.',
    'Recommendation: rotate keys.',
    'Рекомендуется проверить issuer.',
  ])('remembers recommendation %s', async (answer) =>
    expect((await service.update('s1', 'JWT', answer)).recommendations).toContain(answer),
  );

  it('deduplicates file mentions', async () => {
    expect((await service.update('s1', 'src/a.ts src/a.ts', 'src/a.ts')).files).toEqual([
      'src/a.ts',
    ]);
  });

  it('limits active topic length', async () => {
    expect((await service.update('s1', 'x'.repeat(500), 'answer')).topic).toHaveLength(255);
  });

  it('persists structured memory', async () => {
    await service.update('s1', 'Check src/auth.ts', 'You should validate JWT.');
    expect(repository.updateMemory).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ memory: expect.objectContaining({ files: ['src/auth.ts'] }) }),
    );
  });

  it('compresses messages older than the recent window', async () => {
    repository.messagesForMemory.mockResolvedValue(
      Array.from({ length: 25 }, (_, index) => ({
        id: `m${index}`,
        role: MessageRole.USER,
        content: `message ${index}`,
        createdAt: new Date(index),
      })),
    );
    await service.update('s1', 'question', 'answer');
    expect(summaries.summarize).toHaveBeenCalledWith(expect.any(Array));
  });

  it('does not create a summary for a short conversation', async () => {
    await service.update('s1', 'question', 'answer');
    expect(summaries.summarize).not.toHaveBeenCalled();
  });

  it('loads at most 100 messages', async () => {
    await service.update('s1', 'question', 'answer');
    expect(repository.messagesForMemory).toHaveBeenCalledWith('s1', 100);
  });
});
