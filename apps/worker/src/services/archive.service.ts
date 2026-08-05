import { Injectable } from '@nestjs/common';
import yauzl from 'yauzl';
import { mkdir, createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';

export type ArchiveLimits = { maxFiles?: number; maxUnpackedBytes?: number; maxDepth?: number };

@Injectable()
export class ArchiveService {
  async extract(
    zipPath: string,
    target: string,
    limits: ArchiveLimits = {},
  ): Promise<{ filesCount: number; bytes: number }> {
    const maxFiles = limits.maxFiles ?? 10_000;
    const maxBytes = limits.maxUnpackedBytes ?? 1_073_741_824;
    const maxDepth = limits.maxDepth ?? 30;
    const root = resolve(target);
    return new Promise((resolvePromise, reject) => {
      yauzl.open(zipPath, { lazyEntries: true, validateEntrySizes: true }, (error, archive) => {
        if (error || !archive) return reject(error ?? new Error('Unable to open ZIP archive'));
        let filesCount = 0;
        let bytes = 0;
        const fail = (reason: Error) => {
          archive.close();
          reject(reason);
        };
        archive.on('error', fail);
        archive.on('entry', (entry) => {
          const name = entry.fileName.replaceAll('\\', '/');
          const destination = resolve(root, name);
          const outside =
            relative(root, destination).startsWith('..') || isAbsolute(relative(root, destination));
          if (outside || name.split('/').length > maxDepth)
            return fail(new Error(`Unsafe archive path: ${entry.fileName}`));
          const directory = /\/$/.test(name);
          if (directory) {
            mkdir(destination, { recursive: true }, (e) => (e ? fail(e) : archive.readEntry()));
            return;
          }
          filesCount += 1;
          bytes += entry.uncompressedSize;
          if (filesCount > maxFiles) return fail(new Error('Archive file limit exceeded'));
          if (bytes > maxBytes) return fail(new Error('Archive unpacked size limit exceeded'));
          mkdir(dirname(destination), { recursive: true }, (e) => {
            if (e) return fail(e);
            archive.openReadStream(entry, (streamError, stream) => {
              if (streamError || !stream)
                return fail(streamError ?? new Error('Unable to read ZIP entry'));
              pipeline(stream, createWriteStream(destination))
                .then(() => archive.readEntry())
                .catch(fail);
            });
          });
        });
        archive.on('end', () => resolvePromise({ filesCount, bytes }));
        archive.readEntry();
      });
    });
  }

  async isReadable(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }
}
