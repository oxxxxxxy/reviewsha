import { describe, expect, it, vi } from 'vitest';
import { AnalyzeProcessor } from '../../../src/processors/analyze.processor';
import { ExtractProcessor } from '../../../src/processors/extract.processor';
import { MergeProcessor } from '../../../src/processors/merge.processor';
import { NotifyProcessor } from '../../../src/processors/notify.processor';
import { ParseProcessor } from '../../../src/processors/parse.processor';
import { ProcessorRegistry } from '../../../src/processors/processor.registry';
import { ReportProcessor } from '../../../src/processors/report.processor';

function registry() {
  const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as never;
  return new ProcessorRegistry(
    new ExtractProcessor(logger),
    new ParseProcessor(logger),
    new AnalyzeProcessor(logger),
    new MergeProcessor(logger),
    new ReportProcessor(logger),
    new NotifyProcessor(logger),
  );
}

describe('ProcessorRegistry', () => {
  it('registers extract', () => expect(registry().get('extract')).toBeDefined());
  it('registers parse', () => expect(registry().get('parse')).toBeDefined());
  it('registers analyze', () => expect(registry().get('analyze')).toBeDefined());
  it('registers merge', () => expect(registry().get('merge')).toBeDefined());
  it('registers report', () => expect(registry().get('report')).toBeDefined());
  it('registers notify', () => expect(registry().get('notify')).toBeDefined());
  it('rejects unknown job types', async () => {
    await expect(registry().execute({ name: 'unknown', data: {} } as never)).rejects.toThrow(
      'No handler',
    );
  });
  it('executes a registered handler', async () => {
    await expect(
      registry().execute({
        name: 'extract',
        data: { uploadId: 'u1' },
        id: 'j1',
        queueName: 'file.queue',
      } as never),
    ).resolves.toMatchObject({ status: 'completed', jobId: 'j1' });
  });
  it('rejects missing payloads', async () => {
    await expect(registry().execute({ name: 'parse', data: null } as never)).rejects.toThrow(
      'payload',
    );
  });
  it('keeps handler types deterministic', () => {
    expect([
      ...['extract', 'parse', 'analyze', 'merge', 'report', 'notify'].map(
        (type) => registry().get(type)?.type,
      ),
    ]).toEqual(['extract', 'parse', 'analyze', 'merge', 'report', 'notify']);
  });
});
