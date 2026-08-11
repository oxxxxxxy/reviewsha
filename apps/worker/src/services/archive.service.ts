import { Injectable } from '@nestjs/common';
import yauzl from 'yauzl';
import { mkdir, createWriteStream, createReadStream } from 'node:fs';
import { mkdir as mkdirAsync, stat, readdir } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type ArchiveLimits = { maxFiles?: number; maxUnpackedBytes?: number; maxDepth?: number };

@Injectable()
export class ArchiveService {
  async extract(
    archivePath: string,
    target: string,
    limits: ArchiveLimits = {},
  ): Promise<{ filesCount: number; bytes: number }> {
    const maxFiles = limits.maxFiles ?? 10_000;
    const maxBytes = limits.maxUnpackedBytes ?? 1_073_741_824;
    const maxDepth = limits.maxDepth ?? 30;
    const root = resolve(target);
    const extension = archivePath.toLowerCase();
    if (!extension.endsWith('.zip')) {
      await mkdirAsync(root, { recursive: true });
      let executable = 'bsdtar';
      let args = ['-xf', archivePath, '-C', root];
      if (extension.endsWith('.rar')) {
        executable = 'unrar';
        args = ['x', '-o+', archivePath, `${root}/`];
      } else if (extension.endsWith('.7z')) {
        executable = '7z';
        args = ['x', '-y', `-o${root}`, archivePath];
      }
      try {
        await execFileAsync(executable, args, { timeout: 120_000, maxBuffer: 2_000_000 });
      } catch (error) {
        throw new Error(
          `Unable to extract archive: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
      return this.scanExtracted(root, maxFiles, maxBytes, maxDepth);
    }
    return new Promise((resolvePromise, reject) => {
      yauzl.open(archivePath, { lazyEntries: true, validateEntrySizes: true }, (error, archive) => {
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

  async extractText(input: string, output: string): Promise<void> {
    await mkdirAsync(dirname(output), { recursive: true });
    try {
      await execFileAsync('pdftotext', ['-layout', input, output], {
        timeout: 60_000,
        maxBuffer: 2_000_000,
      });
    } catch {
      // Keep a readable fallback instead of failing the whole project scan.
      await pipeline(createReadStream(input), createWriteStream(output));
    }
  }

  async extractOfficeText(input: string, outputDirectory: string): Promise<void> {
    await mkdirAsync(outputDirectory, { recursive: true });
    try {
      await execFileAsync(
        'libreoffice',
        ['--headless', '--convert-to', 'txt:Text', '--outdir', outputDirectory, input],
        {
          timeout: 120_000,
          maxBuffer: 2_000_000,
        },
      );
    } catch {
      // Some minimal worker images do not ship LibreOffice. The original
      // file is still retained and the parser will skip it if it is binary.
      return;
    }
  }

  private async scanExtracted(root: string, maxFiles: number, maxBytes: number, maxDepth: number) {
    let filesCount = 0;
    let bytes = 0;
    const walk = async (directory: string): Promise<void> => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const absolute = resolve(directory, entry.name);
        const relativePath = relative(root, absolute);
        if (
          relativePath.startsWith('..') ||
          isAbsolute(relativePath) ||
          relativePath.split('/').length > maxDepth
        )
          throw new Error('Unsafe archive path');
        if (entry.isDirectory()) await walk(absolute);
        else if (entry.isFile()) {
          const info = await stat(absolute);
          filesCount += 1;
          bytes += info.size;
          if (filesCount > maxFiles || bytes > maxBytes) throw new Error('Archive limits exceeded');
        }
      }
    };
    await walk(root);
    return { filesCount, bytes };
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
