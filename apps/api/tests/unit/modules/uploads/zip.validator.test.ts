import { describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ZipFile } from 'yazl';
import { ZipValidator } from '../../../../src/modules/uploads/validators/zip.validator';

function archive(entries: Array<[string, string]>): Promise<Buffer> {
  return new Promise((resolve) => {
    const zip = new ZipFile();
    const chunks: Buffer[] = [];
    zip.outputStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    zip.outputStream.on('end', () => resolve(Buffer.concat(chunks)));
    for (const [name, content] of entries) zip.addBuffer(Buffer.from(content), name);
    zip.end();
  });
}

describe('ZipValidator', () => {
  const validator = new ZipValidator();

  it('accepts a valid ZIP archive', async () => {
    const result = await validator.validate(
      'project.zip',
      'application/zip',
      await archive([['package.json', '{}']]),
    );
    expect(result.entries).toBe(1);
  });

  it('validates a ZIP from a temporary file without buffering the upload', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'reviewsha-upload-'));
    const filePath = join(directory, 'project.zip');
    const buffer = await archive([['package.json', '{}']]);
    await writeFile(filePath, buffer);

    try {
      await expect(
        validator.validateFile('project.zip', 'application/zip', buffer.length, filePath),
      ).resolves.toMatchObject({ entries: 1 });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects a non-ZIP extension', async () => {
    await expect(
      validator.validate('project.tar', 'application/zip', Buffer.alloc(30)),
    ).rejects.toThrow('Only ZIP');
  });

  it('rejects a wrong MIME type', async () => {
    await expect(
      validator.validate('project.zip', 'application/octet-stream', Buffer.alloc(30)),
    ).rejects.toThrow('Only ZIP');
  });

  it('rejects an empty or too-small archive', async () => {
    await expect(
      validator.validate('project.zip', 'application/zip', Buffer.alloc(1)),
    ).rejects.toThrow('empty');
  });

  it('rejects corrupted archives', async () => {
    await expect(
      validator.validate('project.zip', 'application/zip', Buffer.alloc(30)),
    ).rejects.toThrow('corrupted');
  });

  it('rejects an empty ZIP archive', async () => {
    await expect(
      validator.validate('project.zip', 'application/zip', await archive([])),
    ).rejects.toThrow('empty');
  });

  it('rejects forbidden dependency directories', async () => {
    await expect(
      validator.validate(
        'project.zip',
        'application/zip',
        await archive([['node_modules/pkg.js', 'x']]),
      ),
    ).rejects.toThrow('forbidden');
  });

  it('rejects environment files from the archive', async () => {
    const archiveBuffer = await archive([['.env', 'DATABASE_URL=secret']]);

    await expect(
      validator.validate('project.zip', 'application/zip', archiveBuffer),
    ).rejects.toThrow('forbidden');
  });

  it('rejects hidden repository metadata', async () => {
    await expect(
      validator.validate('project.zip', 'application/zip', await archive([['.git/config', 'x']])),
    ).rejects.toThrow('forbidden');
  });

  it('returns the uncompressed size', async () => {
    const result = await validator.validate(
      'project.zip',
      'application/zip',
      await archive([['README.md', 'hello']]),
    );
    expect(result.uncompressedSize).toBe(5);
  });

  it('supports multiple project files', async () => {
    const result = await validator.validate(
      'project.zip',
      'application/zip',
      await archive([
        ['package.json', '{}'],
        ['src/index.ts', 'export {};'],
      ]),
    );
    expect(result.entries).toBe(2);
  });
});
