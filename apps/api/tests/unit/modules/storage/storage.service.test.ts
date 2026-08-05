import { describe, expect, it, vi } from 'vitest';
import { StorageService } from '../../../../src/modules/storage/services/storage.service';
import type { StorageProvider } from '../../../../src/modules/storage/interfaces/storage.interface';

function setup() {
  const provider: StorageProvider = {
    ensureBuckets: vi.fn(async () => undefined),
    upload: vi.fn(async (input) => ({ bucket: input.bucket, key: input.key })),
    download: vi.fn(async (bucket, key) => ({ bucket, key, body: {} as never, metadata: {} })),
    getMetadata: vi.fn(async (bucket, key) => ({ bucket, key, contentLength: 3 })),
    delete: vi.fn(async () => undefined),
    exists: vi.fn(async () => true),
    copy: vi.fn(async (source, target) => ({ bucket: target.bucket, key: target.key })),
    move: vi.fn(async (source, target) => ({ bucket: target.bucket, key: target.key })),
    generatePresignedUrl: vi.fn(async () => 'https://minio.local/presigned'),
  };
  const logger = { log: vi.fn() } as never;
  return { provider, service: new StorageService(provider, logger) };
}

describe('StorageService', () => {
  it('initializes configured buckets', async () => {
    const { provider, service } = setup();
    await service.onModuleInit();
    expect(provider.ensureBuckets).toHaveBeenCalledOnce();
  });

  it('uploads objects through the provider', async () => {
    const { provider, service } = setup();
    await service.upload({ bucket: 'projects', key: 'project/file.zip', body: Buffer.from('zip') });
    expect(provider.upload).toHaveBeenCalledOnce();
  });

  it('downloads objects as streams', async () => {
    const { provider, service } = setup();
    await service.download('projects', 'project/file.zip');
    expect(provider.download).toHaveBeenCalledWith('projects', 'project/file.zip');
  });

  it('exposes getObject as a download alias', async () => {
    const { provider, service } = setup();
    await service.getObject('projects', 'project/file.zip');
    expect(provider.download).toHaveBeenCalledOnce();
  });

  it('gets metadata and checks existence', async () => {
    const { provider, service } = setup();
    await expect(service.getMetadata('projects', 'project/file.zip')).resolves.toMatchObject({
      contentLength: 3,
    });
    await expect(service.exists('projects', 'project/file.zip')).resolves.toBe(true);
    expect(provider.getMetadata).toHaveBeenCalledOnce();
  });

  it('deletes objects', async () => {
    const { provider, service } = setup();
    await service.delete('temp', 'job/file');
    expect(provider.delete).toHaveBeenCalledWith('temp', 'job/file');
  });

  it('copies objects', async () => {
    const { provider, service } = setup();
    await service.copy(
      { bucket: 'temp', key: 'source' },
      { bucket: 'projects', key: 'target', body: Buffer.alloc(0) },
    );
    expect(provider.copy).toHaveBeenCalledOnce();
  });

  it('moves objects', async () => {
    const { provider, service } = setup();
    await service.move(
      { bucket: 'temp', key: 'source' },
      { bucket: 'projects', key: 'target', body: Buffer.alloc(0) },
    );
    expect(provider.move).toHaveBeenCalledOnce();
  });

  it('generates expiring presigned URLs', async () => {
    const { provider, service } = setup();
    await expect(service.generatePresignedUrl('reports', 'report.pdf', 300)).resolves.toContain(
      'presigned',
    );
    expect(provider.generatePresignedUrl).toHaveBeenCalledWith('reports', 'report.pdf', 300);
  });

  it('logs operation duration without exposing object bodies', async () => {
    const { service } = setup();
    await service.delete('temp', 'job/file');
    expect(
      (service as unknown as { logger: { log: ReturnType<typeof vi.fn> } }).logger.log,
    ).toHaveBeenCalledWith(expect.stringContaining('Storage delete'), 'StorageService');
  });
});
