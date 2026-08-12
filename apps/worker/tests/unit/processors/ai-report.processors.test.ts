import { ConfigService } from '@nestjs/config';
import { AIRequestStatus, FindingCategory, ReportStatus, Severity } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AnalyzeProcessor } from '../../../src/processors/analyze.processor';
import { ReportProcessor } from '../../../src/processors/report.processor';
import { NotifyProcessor } from '../../../src/processors/notify.processor';
import { PipelineStateService } from '../../../src/services/pipeline-state.service';
import { AIProjectParser } from '../../../src/ai/parser/ai-project.parser';
import { ChunkBuilderService } from '../../../src/ai/chunks/chunk-builder.service';
import { ContextBuilderService } from '../../../src/ai/context/context-builder.service';
import { PromptBuilderService } from '../../../src/ai/prompts/prompt-builder.service';
import { IssueNormalizerService } from '../../../src/reporting/services/issue-normalizer.service';
import { IssueDeduplicatorService } from '../../../src/reporting/services/issue-deduplicator.service';
import { ResultAggregatorService } from '../../../src/reporting/services/result-aggregator.service';
import { ReportGeneratorService } from '../../../src/reporting/services/report-generator.service';
import { MarkdownReportBuilder } from '../../../src/reporting/builders/markdown.builder';
import { JsonReportBuilder } from '../../../src/reporting/builders/json.builder';
import { SecretRedactorService } from '../../../src/ai/services/secret-redactor.service';

const payload = { uploadId: 'upload-1', projectId: 'project-1', pipelineId: 'scan-1' };
const job = (name: string, extra: Record<string, unknown> = {}) =>
  ({
    name,
    data: payload,
    id: `${name}-1`,
    queueName: `${name}.queue`,
    opts: { attempts: 3 },
    ...extra,
  }) as never;
const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as never;

describe('AI and report processors', () => {
  let root: string;
  let paths: { root: string; source: string; extracted: string; output: string };

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'reviewsha-ai-job-'));
    paths = {
      root,
      source: join(root, 'source'),
      extracted: join(root, 'extracted'),
      output: join(root, 'output'),
    };
    await mkdir(join(paths.extracted, 'src'), { recursive: true });
    await mkdir(paths.output, { recursive: true });
    await writeFile(join(paths.extracted, 'src/app.ts'), 'export const value = 1;\n');
    await writeFile(
      join(paths.output, 'context.json'),
      JSON.stringify({
        files: [{ path: 'src/app.ts', language: 'TypeScript', size: 24 }],
        structure: ['src/app.ts'],
        languages: ['TypeScript'],
        statistics: { files: 1 },
      }),
    );
  });

  afterEach(async () => rm(root, { recursive: true, force: true }));

  it('runs one merged project review and persists usage', async () => {
    const requestCreate = vi.fn().mockResolvedValue({ id: 'request-1' });
    const requestUpdate = vi.fn().mockResolvedValue({});
    const responseUpsert = vi.fn();
    const queue = { enqueueJob: vi.fn().mockResolvedValue({}) };
    const ai = {
      analyze: vi.fn().mockResolvedValue({
        response: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        result: { issues: [], summary: 'ok' },
      }),
    };
    const processor = new AnalyzeProcessor(
      {
        scan: {
          findUnique: vi.fn().mockResolvedValue({ id: 'scan-1', createdById: 'user-1' }),
          update: vi.fn(),
        },
        aIRequest: {
          count: vi.fn().mockResolvedValue(0),
          findFirst: vi.fn().mockResolvedValue(null),
          create: requestCreate,
          update: requestUpdate,
        },
        aIResponse: { upsert: responseUpsert, findUnique: vi.fn().mockResolvedValue(null) },
        aIUsage: { upsert: vi.fn() },
        analysisContext: { findFirst: vi.fn().mockResolvedValue(null), upsert: vi.fn() },
      } as never,
      { create: vi.fn().mockResolvedValue(paths) } as never,
      new AIProjectParser(),
      new ChunkBuilderService(),
      new ContextBuilderService(),
      new PromptBuilderService(),
      ai as never,
      new SecretRedactorService(),
      queue as never,
      new ConfigService({ worker: { aiModel: 'deepseek-chat' } }),
      logger,
    );
    const result = await processor.execute(job('analyze'));
    expect(ai.analyze).toHaveBeenCalledOnce();
    expect(requestCreate).toHaveBeenCalledOnce();
    expect(requestUpdate).toHaveBeenCalledOnce();
    expect(requestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: AIRequestStatus.COMPLETED }),
      }),
    );
    expect(responseUpsert).toHaveBeenCalledOnce();
    expect(queue.enqueueJob).toHaveBeenCalledWith('report.queue', 'report', payload);
    expect(result.data).toMatchObject({ totalTokens: 15 });
  });

  it('persists failed AI request and propagates error', async () => {
    const requestUpdate = vi.fn();
    const processor = new AnalyzeProcessor(
      {
        scan: {
          findUnique: vi.fn().mockResolvedValue({ id: 'scan-1', createdById: null }),
          update: vi.fn(),
        },
        aIRequest: {
          count: vi.fn().mockResolvedValue(0),
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 'request-1' }),
          update: requestUpdate,
        },
        aIResponse: { upsert: vi.fn(), findUnique: vi.fn().mockResolvedValue(null) },
        aIUsage: { upsert: vi.fn() },
        analysisContext: { findFirst: vi.fn().mockResolvedValue(null), upsert: vi.fn() },
      } as never,
      { create: vi.fn().mockResolvedValue(paths) } as never,
      new AIProjectParser(),
      new ChunkBuilderService(),
      new ContextBuilderService(),
      new PromptBuilderService(),
      { analyze: vi.fn().mockRejectedValue(new Error('AI unavailable')) } as never,
      new SecretRedactorService(),
      { enqueueJob: vi.fn() } as never,
      new ConfigService({ worker: { aiModel: 'deepseek-chat' } }),
      logger,
    );
    await expect(processor.execute(job('analyze'))).rejects.toThrow('AI unavailable');
    expect(requestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: AIRequestStatus.FAILED }),
      }),
    );
  });

  it('reuses a completed logical review after a BullMQ retry', async () => {
    const requestCreate = vi.fn().mockResolvedValue({ id: 'request-file' });
    const requestUpdate = vi.fn().mockResolvedValue({ id: 'request-file' });
    const requestFind = vi.fn(({ where }: { where: { chunkId?: string } }) =>
      where.chunkId === 'project:architecture'
        ? Promise.resolve({ id: 'request-project', status: AIRequestStatus.COMPLETED })
        : Promise.resolve(null),
    );
    const ai = {
      analyze: vi.fn().mockResolvedValue({
        response: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        result: { issues: [], summary: 'fresh file review' },
      }),
    };
    const processor = new AnalyzeProcessor(
      {
        scan: {
          findUnique: vi.fn().mockResolvedValue({ id: 'scan-1', createdById: null }),
          update: vi.fn(),
        },
        aIRequest: {
          count: vi.fn().mockResolvedValue(0),
          findFirst: requestFind,
          create: requestCreate,
          update: requestUpdate,
        },
        aIResponse: {
          upsert: vi.fn(),
          findUnique: vi.fn().mockResolvedValue({
            result: { issues: [], summary: 'cached project review' },
            totalTokens: 7,
          }),
        },
        aIUsage: { upsert: vi.fn() },
        analysisContext: { findFirst: vi.fn().mockResolvedValue(null), upsert: vi.fn() },
      } as never,
      { create: vi.fn().mockResolvedValue(paths) } as never,
      new AIProjectParser(),
      new ChunkBuilderService(),
      new ContextBuilderService(),
      new PromptBuilderService(),
      ai as never,
      new SecretRedactorService(),
      { enqueueJob: vi.fn().mockResolvedValue({}) } as never,
      new ConfigService({ worker: { aiModel: 'deepseek-chat' } }),
      logger,
    );

    await processor.execute(job('analyze'));

    expect(requestFind).toHaveBeenCalledWith(
      expect.objectContaining({ where: { scanId: 'scan-1', chunkId: 'project:architecture' } }),
    );
    expect(requestCreate).not.toHaveBeenCalled();
    expect(requestUpdate).not.toHaveBeenCalled();
    expect(ai.analyze).not.toHaveBeenCalled();
  });

  it('rejects an unknown analysis', async () => {
    const processor = new AnalyzeProcessor(
      { scan: { findUnique: vi.fn().mockResolvedValue(null) } } as never,
      { create: vi.fn().mockResolvedValue(paths) } as never,
      new AIProjectParser(),
      new ChunkBuilderService(),
      new ContextBuilderService(),
      new PromptBuilderService(),
      {} as never,
      new SecretRedactorService(),
      {} as never,
      new ConfigService({ worker: { aiModel: 'deepseek-chat' } }),
      logger,
    );
    await expect(processor.execute(job('analyze'))).rejects.toThrow('Analysis not found');
  });

  it('generates an idempotent report and findings', async () => {
    await writeFile(
      join(paths.output, 'ai-results.json'),
      JSON.stringify({
        totalTokens: 42,
        results: [
          {
            summary: 'summary',
            issues: [
              {
                severity: Severity.HIGH,
                file: 'src/app.ts',
                line: 1,
                problem: 'security token issue',
                recommendation: 'validate token',
              },
            ],
          },
        ],
      }),
    );
    const reportUpsert = vi.fn().mockResolvedValue({ id: 'report-1' });
    const findingDelete = vi.fn();
    const findingCreate = vi.fn();
    const database = {
      scan: { findUnique: vi.fn().mockResolvedValue({ status: 'ANALYZING' }) },
      report: { upsert: reportUpsert },
      finding: { deleteMany: findingDelete, createMany: findingCreate },
    };
    const db = {
      scan: { findUnique: vi.fn().mockResolvedValue({ id: 'scan-1' }), update: vi.fn() },
      $transaction: vi.fn((callback) => callback(database)),
    };
    const queue = { enqueueJob: vi.fn().mockResolvedValue({}) };
    const generator = new ReportGeneratorService(
      new ResultAggregatorService(new IssueNormalizerService(), new IssueDeduplicatorService()),
    );
    const processor = new ReportProcessor(
      db as never,
      { create: vi.fn().mockResolvedValue(paths) } as never,
      generator,
      new MarkdownReportBuilder(),
      new JsonReportBuilder(),
      queue as never,
      logger,
    );
    const result = await processor.execute(job('report'));
    expect(reportUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ status: ReportStatus.READY }) }),
    );
    expect(findingDelete).toHaveBeenCalledBefore(findingCreate);
    expect(findingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({ category: FindingCategory.SECURITY, severity: Severity.HIGH }),
        ],
      }),
    );
    expect(queue.enqueueJob).toHaveBeenCalledWith(
      'notification.queue',
      'notify',
      expect.objectContaining({ reportId: 'report-1' }),
    );
    expect(result.data).toMatchObject({ reportId: 'report-1' });
  });

  it('keeps AI-generated finding titles within the database limit', async () => {
    await writeFile(
      join(paths.output, 'ai-results.json'),
      JSON.stringify({
        results: [
          {
            summary: 'summary',
            issues: [
              {
                severity: Severity.HIGH,
                file: 'src/app.ts',
                line: 1,
                problem: 'x'.repeat(300),
                recommendation: 'validate token',
              },
            ],
          },
        ],
      }),
    );
    const findingCreate = vi.fn();
    const database = {
      scan: { findUnique: vi.fn().mockResolvedValue({ status: 'ANALYZING' }) },
      report: { upsert: vi.fn().mockResolvedValue({ id: 'report-long-title' }) },
      finding: { deleteMany: vi.fn(), createMany: findingCreate },
    };
    const db = {
      scan: { findUnique: vi.fn().mockResolvedValue({ id: 'scan-1' }), update: vi.fn() },
      $transaction: vi.fn((callback) => callback(database)),
    };
    const queue = { enqueueJob: vi.fn().mockResolvedValue({}) };
    const generator = new ReportGeneratorService(
      new ResultAggregatorService(new IssueNormalizerService(), new IssueDeduplicatorService()),
    );
    const processor = new ReportProcessor(
      db as never,
      { create: vi.fn().mockResolvedValue(paths) } as never,
      generator,
      new MarkdownReportBuilder(),
      new JsonReportBuilder(),
      queue as never,
      logger,
    );

    await processor.execute(job('report'));

    expect(findingCreate).toHaveBeenCalledTimes(1);
    const title = findingCreate.mock.calls[0]![0].data[0].title as string;
    expect(Array.from(title)).toHaveLength(240);
  });

  it('completes the scan and schedules cleanup after notification', async () => {
    const update = vi.fn().mockResolvedValue({ createdById: null });
    const queue = { enqueueJob: vi.fn().mockResolvedValue({}) };
    const processor = new NotifyProcessor(
      {
        scan: { update },
        project: { update: vi.fn() },
        notification: { findFirst: vi.fn(), create: vi.fn() },
      } as never,
      queue as never,
      logger,
    );
    await processor.execute(job('notify'));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ progress: 100 }) }),
    );
    expect(queue.enqueueJob).toHaveBeenCalledWith('file.queue', 'cleanup', payload);
  });

  it.each([
    ['analyze', new Error('timeout'), 'ANALYZE_TIMEOUT'],
    ['report', new Error('broken data'), 'REPORT_FAILED'],
  ])('persists terminal %s failure and schedules cleanup', async (stage, error, code) => {
    const update = vi.fn().mockResolvedValue({});
    const queue = { enqueueJob: vi.fn().mockResolvedValue({}) };
    const service = new PipelineStateService(
      {
        scan: { update },
        report: { upsert: vi.fn().mockResolvedValue({}) },
        notification: { findFirst: vi.fn(), create: vi.fn() },
      } as never,
      queue as never,
      logger,
    );
    await service.fail(job(stage, { attemptsMade: 3 }), error);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pipelineErrorCode: code }) }),
    );
    expect(queue.enqueueJob).toHaveBeenCalledWith(
      'dead-letter.queue',
      'pipeline.dead-letter',
      expect.objectContaining({ stage, errorCode: code }),
    );
    expect(queue.enqueueJob).toHaveBeenCalledWith('file.queue', 'cleanup', payload);
  });

  it('does not mark a retriable attempt as terminal', async () => {
    const update = vi.fn();
    const queue = { enqueueJob: vi.fn() };
    const service = new PipelineStateService({ scan: { update } } as never, queue as never, logger);
    await service.fail(job('analyze', { attemptsMade: 1 }), new Error('timeout'));
    expect(update).not.toHaveBeenCalled();
    expect(queue.enqueueJob).not.toHaveBeenCalled();
  });

  it('does not recursively cleanup a failed cleanup job', async () => {
    const update = vi.fn();
    const queue = { enqueueJob: vi.fn() };
    const service = new PipelineStateService({ scan: { update } } as never, queue as never, logger);
    await service.fail(job('cleanup', { attemptsMade: 3 }), new Error('filesystem'));
    expect(queue.enqueueJob).not.toHaveBeenCalled();
  });
});
