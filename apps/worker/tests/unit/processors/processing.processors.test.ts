import { describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DownloadProcessor } from '../../../src/processors/download.processor';
import { ExtractProcessor } from '../../../src/processors/extract.processor';
import { ParseProcessor } from '../../../src/processors/parse.processor';
import { MergeProcessor } from '../../../src/processors/merge.processor';
import { CleanupProcessor } from '../../../src/processors/cleanup.processor';

const job = (
  name: string,
  data: unknown = { uploadId: 'u1', projectId: 'p1', pipelineId: 'pipe' },
) => ({ name, data, id: `${name}-1`, queueName: 'file.queue' }) as never;
const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as never;

describe('processing processors', () => {
  it('downloads, verifies and persists an archive result', async () => {
    const root = await mkdtemp(join(tmpdir(), 'reviewsha-process-'));
    const bytes = Buffer.from('zip-content');
    const checksum = createHash('sha256').update(bytes).digest('hex');
    const workspace = {
      root,
      source: join(root, 'source'),
      extracted: join(root, 'extracted'),
      output: join(root, 'output'),
    };
    const { mkdir } = await import('node:fs/promises');
    await mkdir(workspace.source, { recursive: true });
    await mkdir(workspace.output, { recursive: true });
    const processor = new DownloadProcessor(
      {
        uploadedFile: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'u1',
            bucket: 'uploads',
            objectKey: 'k',
            size: BigInt(bytes.length),
            checksum,
            deletedAt: null,
          }),
        },
      } as never,
      { getObject: vi.fn().mockResolvedValue(Readable.from(bytes)) } as never,
      { create: vi.fn().mockResolvedValue(workspace) } as never,
      { enqueueJob: vi.fn().mockResolvedValue({ disabled: false }) } as never,
      logger,
    );
    await expect(processor.execute(job('download'))).resolves.toMatchObject({
      status: 'completed',
    });
    expect(await readFile(join(root, 'source/archive.zip'))).toEqual(bytes);
    await rm(root, { recursive: true, force: true });
  });

  it('extracts an archive and schedules parsing', async () => {
    const workspace = {
      root: '/tmp/p',
      source: '/tmp/p/source',
      extracted: '/tmp/p/extracted',
      output: '/tmp/p/output',
    };
    const archive = { extract: vi.fn().mockResolvedValue({ filesCount: 2, bytes: 20 }) };
    const queue = { enqueueJob: vi.fn() };
    const processor = new ExtractProcessor(
      archive as never,
      { create: vi.fn().mockResolvedValue(workspace) } as never,
      queue as never,
      logger,
    );
    await expect(processor.execute(job('extract'))).resolves.toMatchObject({
      data: { filesCount: 2 },
    });
    expect(queue.enqueueJob).toHaveBeenCalled();
  });

  it('parses a workspace and schedules merge', async () => {
    const workspace = {
      root: '/tmp/p',
      source: '/tmp/p/source',
      extracted: '/tmp/p/extracted',
      output: '/tmp/p/output',
    };
    const parser = {
      parse: vi.fn().mockResolvedValue({
        files: [],
        languages: [],
        structure: [],
        statistics: { files: 0, bytes: 0, lines: 0 },
      }),
    };
    const queue = { enqueueJob: vi.fn() };
    const processor = new ParseProcessor(
      parser as never,
      { create: vi.fn().mockResolvedValue(workspace) } as never,
      queue as never,
      logger,
    );
    await expect(processor.execute(job('parse'))).resolves.toMatchObject({ status: 'completed' });
    expect(parser.parse).toHaveBeenCalledWith(workspace.extracted);
  });

  it('merges stage files and schedules cleanup', async () => {
    const root = await mkdtemp(join(tmpdir(), 'reviewsha-merge-'));
    const paths = {
      root,
      source: join(root, 'source'),
      extracted: join(root, 'extracted'),
      output: join(root, 'output'),
    };
    const { mkdir, writeFile } = await import('node:fs/promises');
    await mkdir(paths.output, { recursive: true });
    await writeFile(join(paths.output, 'download.json'), '{}');
    await writeFile(join(paths.output, 'extract.json'), '{}');
    await writeFile(
      join(paths.output, 'parse.json'),
      JSON.stringify({
        files: [],
        languages: [],
        structure: [],
        statistics: { files: 0, bytes: 0, lines: 0 },
      }),
    );
    const queue = { enqueueJob: vi.fn() };
    const processor = new MergeProcessor(
      { merge: vi.fn().mockReturnValue({ statistics: {} }) } as never,
      { create: vi.fn().mockResolvedValue(paths) } as never,
      queue as never,
      logger,
    );
    await expect(processor.execute(job('merge'))).resolves.toMatchObject({ status: 'completed' });
    expect(queue.enqueueJob).toHaveBeenCalled();
    await rm(root, { recursive: true, force: true });
  });

  it('cleans a pipeline workspace idempotently', async () => {
    const cleanup = { cleanupWorkspace: vi.fn().mockResolvedValue(undefined) };
    const processor = new CleanupProcessor(
      cleanup as never,
      { enqueueJob: vi.fn() } as never,
      logger,
    );
    await processor.execute(job('cleanup'));
    await processor.execute(job('cleanup'));
    expect(cleanup.cleanupWorkspace).toHaveBeenCalledTimes(2);
  });
});
