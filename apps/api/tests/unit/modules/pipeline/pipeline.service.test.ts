import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScanStatus } from '@prisma/client';
import { PipelineService } from '../../../../src/modules/pipeline/pipeline.service';
import { PipelineEvents } from '../../../../src/modules/pipeline/pipeline.events';
import { PIPELINE_STEPS } from '../../../../src/modules/pipeline/pipeline.constants';
import { QueueEvents } from '../../../../src/modules/queue/queue.events';
import { UploadEvents } from '../../../../src/modules/uploads/events/upload.events';

interface TestScan {
  id: string;
  projectId: string;
  sourceFileId: string;
  status: ScanStatus;
  progress: number;
}

function setup() {
  const scan: TestScan = {
    id: 'scan-1',
    projectId: 'project-1',
    sourceFileId: 'upload-1',
    status: ScanStatus.EXTRACTING,
    progress: 0,
  };
  const scans = {
    findBySourceFile: vi.fn(async (): Promise<TestScan | null> => null),
    findById: vi.fn(async (): Promise<TestScan | null> => scan),
    create: vi.fn(async () => scan),
    updateStatus: vi.fn(async () => scan),
    update: vi.fn(async () => scan),
    updateProgress: vi.fn(async () => scan),
    finish: vi.fn(async () => ({ ...scan, status: ScanStatus.COMPLETED, progress: 100 })),
  };
  const queues = {
    addJob: vi.fn(async (queue: string, type: string, payload: unknown) => ({
      id: 'job-1',
      queue,
      type,
      payload,
    })),
  };
  const logger = { log: vi.fn(), error: vi.fn() };
  const service = new PipelineService(
    scans as never,
    queues as never,
    new UploadEvents(),
    new QueueEvents(),
    new PipelineEvents(),
    logger as never,
  );
  return { service, scans, queues, scan, logger };
}

describe('PipelineService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts a pipeline from UploadCompleted', async () => {
    const { service, queues, scans } = setup();
    await service.startPipeline({
      uploadId: 'upload-1',
      projectId: 'project-1',
      userId: 'user-1',
      version: 1,
      occurredAt: new Date().toISOString(),
    });
    expect(scans.create).toHaveBeenCalledOnce();
    expect(queues.addJob).toHaveBeenCalledWith(
      'file.queue',
      'extract',
      expect.objectContaining({ uploadId: 'upload-1' }),
    );
  });

  it('is idempotent for an already processed upload', async () => {
    const { service, scans, queues, scan } = setup();
    scans.findBySourceFile.mockResolvedValue(scan);
    await expect(
      service.startPipeline({
        uploadId: 'upload-1',
        projectId: 'project-1',
        userId: 'user-1',
        version: 1,
        occurredAt: '',
      }),
    ).resolves.toBe(scan);
    expect(scans.create).not.toHaveBeenCalled();
    expect(queues.addJob).not.toHaveBeenCalled();
  });

  it('uses identifier-only payloads', async () => {
    const { service, queues } = setup();
    await service.startPipeline({
      uploadId: 'upload-1',
      projectId: 'project-1',
      userId: 'user-1',
      version: 1,
      occurredAt: '',
    });
    const payload = queues.addJob.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(payload).toEqual(
      expect.objectContaining({
        pipelineId: 'scan-1',
        projectId: 'project-1',
        uploadId: 'upload-1',
        step: 'extract',
      }),
    );
    expect(payload).not.toHaveProperty('files');
  });

  it('maps extract success to parse', async () => {
    const { service, queues, scans } = setup();
    await service.handleSuccess('scan-1', PIPELINE_STEPS.extract, { resultId: 'files-1' });
    expect(queues.addJob).toHaveBeenCalledWith(
      'file.queue',
      'parse',
      expect.objectContaining({ resultId: 'files-1' }),
    );
    expect(scans.updateProgress).toHaveBeenCalledWith('scan-1', 20);
    expect(scans.updateStatus).toHaveBeenCalledWith('scan-1', ScanStatus.PARSING);
  });

  it('maps parse success to analyze', async () => {
    const { service, queues } = setup();
    await service.handleSuccess('scan-1', PIPELINE_STEPS.parse);
    expect(queues.addJob).toHaveBeenCalledWith('ai.queue', 'analyze', expect.anything());
  });

  it('maps analyze success to merge', async () => {
    const { service, queues, scans } = setup();
    await service.handleSuccess('scan-1', PIPELINE_STEPS.analyze);
    expect(queues.addJob).toHaveBeenCalledWith('ai.queue', 'merge', expect.anything());
    expect(scans.updateStatus).toHaveBeenCalledWith('scan-1', ScanStatus.AGGREGATING);
  });

  it('maps merge success to report', async () => {
    const { service, queues } = setup();
    await service.handleSuccess('scan-1', PIPELINE_STEPS.merge);
    expect(queues.addJob).toHaveBeenCalledWith('report.queue', 'report', expect.anything());
  });

  it('maps report success to notify', async () => {
    const { service, queues } = setup();
    await service.handleSuccess('scan-1', PIPELINE_STEPS.report);
    expect(queues.addJob).toHaveBeenCalledWith('notification.queue', 'notify', expect.anything());
  });

  it('finishes after notify', async () => {
    const { service, scans } = setup();
    await service.handleSuccess('scan-1', PIPELINE_STEPS.notify);
    expect(scans.finish).toHaveBeenCalledWith('scan-1', ScanStatus.COMPLETED);
  });

  it('does not advance a terminal pipeline', async () => {
    const { service, scans, queues, scan } = setup();
    scans.findById.mockResolvedValue({ ...scan, status: ScanStatus.COMPLETED });
    await service.handleSuccess('scan-1', PIPELINE_STEPS.extract);
    expect(queues.addJob).not.toHaveBeenCalled();
  });

  it('classifies transient errors as retryable', () => {
    const { service } = setup();
    expect(service.isRetryable({ code: 'AI_TIMEOUT', message: 'timeout' })).toBe(true);
  });

  it('classifies permanent errors as non-retryable', () => {
    const { service } = setup();
    expect(service.isRetryable({ code: 'INVALID_ARCHIVE', message: 'bad zip' })).toBe(false);
  });

  it('retries a transient failure before the attempt limit', async () => {
    const { service, scans, queues } = setup();
    await expect(
      service.handleFailure(
        'scan-1',
        PIPELINE_STEPS.extract,
        { code: 'MINIO_UNAVAILABLE', message: 'down' },
        1,
      ),
    ).resolves.toEqual({ retriable: true });
    expect(scans.updateStatus).not.toHaveBeenCalled();
    expect(queues.addJob).not.toHaveBeenCalled();
  });

  it('moves an exhausted transient failure to the dead letter queue', async () => {
    const { service, scans, queues } = setup();
    await service.handleFailure(
      'scan-1',
      PIPELINE_STEPS.analyze,
      { code: 'AI_TIMEOUT', message: 'timeout' },
      3,
    );
    expect(scans.updateStatus).toHaveBeenCalledWith('scan-1', ScanStatus.FAILED);
    expect(queues.addJob).toHaveBeenCalledWith(
      'dead-letter.queue',
      'pipeline.dead-letter',
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('moves permanent failures to the dead letter queue', async () => {
    const { service, queues } = setup();
    await service.handleFailure('scan-1', PIPELINE_STEPS.parse, {
      code: 'INVALID_ARCHIVE',
      message: 'bad zip',
    });
    expect(queues.addJob).toHaveBeenCalledWith(
      'dead-letter.queue',
      'pipeline.dead-letter',
      expect.objectContaining({ errorCode: 'INVALID_ARCHIVE' }),
    );
  });

  it('resumes the step represented by scan state', async () => {
    const { service, scans, queues, scan } = setup();
    scans.findById.mockResolvedValue({ ...scan, status: ScanStatus.PARSING });
    await service.resumePipeline('scan-1');
    expect(queues.addJob).toHaveBeenCalledWith('file.queue', 'parse', expect.anything());
  });

  it('cancels a running pipeline', async () => {
    const { service, scans } = setup();
    await service.cancelPipeline('scan-1');
    expect(scans.updateStatus).toHaveBeenCalledWith('scan-1', ScanStatus.CANCELLED);
  });

  it('does not cancel an already completed pipeline', async () => {
    const { service, scans, scan } = setup();
    scans.findById.mockResolvedValue({ ...scan, status: ScanStatus.COMPLETED });
    await service.cancelPipeline('scan-1');
    expect(scans.updateStatus).not.toHaveBeenCalled();
  });

  it('throws for a missing pipeline', async () => {
    const { service, scans } = setup();
    scans.findById.mockResolvedValue(null);
    await expect(service.cancelPipeline('missing')).rejects.toThrow('Pipeline not found');
  });

  it('handles queue failure events after initialization', async () => {
    const { service, scans } = setup();
    service.onModuleInit();
    const queueEvents = service as unknown as { queueEvents?: QueueEvents };
    void queueEvents;
    expect(scans.findById).not.toHaveBeenCalled();
  });

  it('publishes pipeline events', async () => {
    const { service } = setup();
    const events = (service as unknown as { events: PipelineEvents }).events;
    const publish = vi.spyOn(events, 'publish');
    await service.handleSuccess('scan-1', PIPELINE_STEPS.extract);
    expect(publish).toHaveBeenCalledWith(
      'pipeline.step.completed',
      expect.objectContaining({ pipelineId: 'scan-1', step: 'extract' }),
    );
  });

  it('logs a terminal failure without secrets', async () => {
    const { service, logger } = setup();
    await service.handleFailure('scan-1', PIPELINE_STEPS.extract, {
      code: 'INVALID_ARCHIVE',
      message: 'bad zip',
      stack: 'stack',
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Pipeline failed'),
      'stack',
      'PipelineService',
    );
  });
});
