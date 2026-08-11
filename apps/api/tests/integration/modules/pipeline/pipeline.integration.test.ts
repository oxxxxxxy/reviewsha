import { describe, expect, it, vi } from 'vitest';
import { ScanStatus } from '@prisma/client';
import { PipelineService } from '../../../../src/modules/pipeline/pipeline.service';
import { PipelineEvents } from '../../../../src/modules/pipeline/pipeline.events';
import { QueueEvents } from '../../../../src/modules/queue/queue.events';
import { UploadEvents } from '../../../../src/modules/uploads/events/upload.events';

interface TestScan {
  id: string;
  projectId: string;
  sourceFileId: string;
  status: ScanStatus;
  progress: number;
}

function service() {
  const state: TestScan = {
    id: 'scan-1',
    projectId: 'project-1',
    sourceFileId: 'upload-1',
    status: ScanStatus.EXTRACTING,
    progress: 0,
  };
  const scans = {
    findBySourceFile: vi.fn(async (): Promise<TestScan | null> => null),
    findById: vi.fn(async (): Promise<TestScan | null> => state),
    create: vi.fn(async () => state),
    updateStatus: vi.fn(async (_id: string, status: ScanStatus) => {
      state.status = status;
      return state;
    }),
    update: vi.fn(async () => state),
    updateProgress: vi.fn(async (_id: string, progress: number) => {
      state.progress = progress;
      return state;
    }),
    finish: vi.fn(async () => {
      state.status = ScanStatus.COMPLETED;
      state.progress = 100;
      return state;
    }),
    resetReviewRequests: vi.fn(async () => undefined),
  };
  const queues = { addJob: vi.fn(async (...args: unknown[]) => ({ id: 'job-1', args })) };
  return {
    api: new PipelineService(
      scans as never,
      queues as never,
      new UploadEvents(),
      new QueueEvents(),
      new PipelineEvents(),
      { log: vi.fn(), error: vi.fn() } as never,
    ),
    scans,
    queues,
    state,
  };
}

describe('pipeline orchestration integration', () => {
  it('creates a state record from upload completion', async () => {
    const x = service();
    await x.api.startPipeline({
      uploadId: 'upload-1',
      projectId: 'project-1',
      userId: 'user-1',
      version: 1,
      occurredAt: '',
    });
    expect(x.scans.create).toHaveBeenCalled();
  });
  it('enqueues extract on trigger', async () => {
    const x = service();
    await x.api.startPipeline({
      uploadId: 'upload-1',
      projectId: 'project-1',
      userId: 'user-1',
      version: 1,
      occurredAt: '',
    });
    expect(x.queues.addJob.mock.calls[0]?.[0]).toBe('file.queue');
  });
  it('does not duplicate a completed upload event', async () => {
    const x = service();
    x.scans.findBySourceFile.mockResolvedValue(x.state);
    await x.api.startPipeline({
      uploadId: 'upload-1',
      projectId: 'project-1',
      userId: 'user-1',
      version: 1,
      occurredAt: '',
    });
    expect(x.scans.create).not.toHaveBeenCalled();
  });
  it('advances extract to parse', async () => {
    const x = service();
    await x.api.handleSuccess('scan-1', 'extract');
    expect(x.queues.addJob.mock.calls[0]?.[0]).toBe('file.queue');
    expect(x.queues.addJob.mock.calls[0]?.[1]).toBe('parse');
  });
  it('advances parse to merge', async () => {
    const x = service();
    await x.api.handleSuccess('scan-1', 'parse');
    expect(x.queues.addJob.mock.calls[0]?.[0]).toBe('file.queue');
  });
  it('advances analyze to report', async () => {
    const x = service();
    await x.api.handleSuccess('scan-1', 'analyze');
    expect(x.queues.addJob.mock.calls[0]?.[1]).toBe('report');
  });
  it('advances merge to analyze', async () => {
    const x = service();
    await x.api.handleSuccess('scan-1', 'merge');
    expect(x.queues.addJob.mock.calls[0]?.[0]).toBe('ai.queue');
  });
  it('advances report to notify', async () => {
    const x = service();
    await x.api.handleSuccess('scan-1', 'report');
    expect(x.queues.addJob.mock.calls[0]?.[0]).toBe('notification.queue');
  });
  it('completes after notify', async () => {
    const x = service();
    await x.api.handleSuccess('scan-1', 'notify');
    expect(x.state.status).toBe(ScanStatus.COMPLETED);
  });
  it('records progress after a step', async () => {
    const x = service();
    await x.api.handleSuccess('scan-1', 'parse');
    expect(x.state.progress).toBe(40);
  });
  it('retries temporary errors', async () => {
    const x = service();
    await expect(
      x.api.handleFailure('scan-1', 'analyze', { code: 'AI_TIMEOUT', message: 'timeout' }, 1),
    ).resolves.toEqual({ retriable: true });
  });
  it('dead-letters permanent errors', async () => {
    const x = service();
    await x.api.handleFailure('scan-1', 'parse', { code: 'INVALID_ARCHIVE', message: 'bad' });
    expect(x.queues.addJob.mock.calls[0]?.[0]).toBe('dead-letter.queue');
  });
  it('dead-letters after retry exhaustion', async () => {
    const x = service();
    await x.api.handleFailure('scan-1', 'analyze', { code: 'AI_TIMEOUT', message: 'timeout' }, 3);
    expect(x.queues.addJob.mock.calls[0]?.[1]).toBe('pipeline.dead-letter');
  });
  it('resumes from persisted state', async () => {
    const x = service();
    x.state.status = ScanStatus.PARSING;
    await x.api.resumePipeline('scan-1');
    expect(x.queues.addJob.mock.calls[0]?.[1]).toBe('parse');
  });
  it('cancels state and prevents further completion', async () => {
    const x = service();
    await x.api.cancelPipeline('scan-1');
    expect(x.state.status).toBe(ScanStatus.CANCELLED);
    await x.api.handleSuccess('scan-1', 'extract');
    expect(x.queues.addJob).not.toHaveBeenCalled();
  });
});
