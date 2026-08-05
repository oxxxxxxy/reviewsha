import { describe, expect, it, vi } from 'vitest';
import { ProcessorRegistry } from '../../../src/processors/processor.registry';
import type { JobHandler } from '../../../src/processors/job-handler.interface';

function handler(type: string): JobHandler {
  return {
    type,
    execute: vi.fn(async (job) => ({
      status: 'completed' as const,
      queue: job.queueName,
      jobId: String(job.id),
    })),
  };
}
function registry() {
  return new ProcessorRegistry(
    handler('extract') as never,
    handler('download') as never,
    handler('parse') as never,
    handler('analyze') as never,
    handler('merge') as never,
    handler('report') as never,
    handler('notify') as never,
    handler('cleanup') as never,
  );
}

describe('ProcessorRegistry', () => {
  it.each(['download', 'extract', 'parse', 'analyze', 'merge', 'report', 'notify', 'cleanup'])(
    'registers %s',
    (type) => expect(registry().get(type)).toBeDefined(),
  );
  it('rejects unknown job types', async () =>
    expect(registry().execute({ name: 'unknown', data: {} } as never)).rejects.toThrow(
      'No handler',
    ));
  it('executes a registered handler', async () =>
    expect(
      registry().execute({ name: 'extract', data: {}, id: 'j1', queueName: 'file.queue' } as never),
    ).resolves.toMatchObject({ status: 'completed', jobId: 'j1' }));
  it('keeps handler types deterministic', () =>
    expect(
      ['download', 'extract', 'parse', 'analyze', 'merge', 'report', 'notify', 'cleanup'].map(
        (type) => registry().get(type)?.type,
      ),
    ).toEqual(['download', 'extract', 'parse', 'analyze', 'merge', 'report', 'notify', 'cleanup']));
});
