import { Injectable } from '@nestjs/common';
import { open as openFile, fromBuffer, type Entry, type ZipFile } from 'yauzl';
import {
  UPLOAD_ALLOWED_EXTENSION,
  UPLOAD_IGNORED_PATHS,
  UPLOAD_FORBIDDEN_FILES,
  UPLOAD_MAX_COMPRESSION_RATIO,
  UPLOAD_MAX_ENTRIES,
  UPLOAD_MAX_SIZE_BYTES,
  UPLOAD_MAX_UNCOMPRESSED_BYTES,
  UPLOAD_MIN_SIZE_BYTES,
  UPLOAD_MIME_TYPE,
  UPLOAD_SUPPORTED_EXTENSIONS,
} from '../constants/upload.constants';
import {
  FileTooLargeException,
  InvalidArchiveException,
  InvalidFileTypeException,
  ZipBombDetectedException,
} from '../exceptions/upload.exceptions';

export interface ZipValidationResult {
  readonly entries: number;
  readonly uncompressedSize: number;
}

@Injectable()
export class ZipValidator {
  async validate(fileName: string, mimeType: string, buffer: Buffer): Promise<ZipValidationResult> {
    return this.validateZip(fileName, mimeType, buffer.length, (callback) =>
      fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, callback),
    );
  }

  async validateFile(
    fileName: string,
    mimeType: string,
    size: number,
    filePath: string,
  ): Promise<ZipValidationResult> {
    return this.validateZip(fileName, mimeType, size, (callback) =>
      openFile(filePath, { lazyEntries: true, validateEntrySizes: true }, callback),
    );
  }

  private validateZip(
    fileName: string,
    mimeType: string,
    size: number,
    open: (callback: (error: Error | null, zip?: ZipFile) => void) => void,
  ): Promise<ZipValidationResult> {
    const lowerName = fileName.toLowerCase();
    const supported = UPLOAD_SUPPORTED_EXTENSIONS.some((extension) =>
      lowerName.endsWith(extension),
    );
    if (!supported) {
      throw new InvalidFileTypeException();
    }
    if (size > UPLOAD_MAX_SIZE_BYTES) {
      throw new FileTooLargeException();
    }

    // Non-ZIP inputs are validated by extension/size here and normalized by
    // the worker. Archives are structurally validated during extraction with
    // the matching system tool (7z/bsdtar/unrar).
    if (!lowerName.endsWith(UPLOAD_ALLOWED_EXTENSION) || mimeType !== UPLOAD_MIME_TYPE) {
      return Promise.resolve({ entries: 1, uncompressedSize: size });
    }
    if (size < UPLOAD_MIN_SIZE_BYTES) {
      throw new InvalidArchiveException('Archive is empty');
    }
    return new Promise((resolve, reject) => {
      open((error, zip) => {
        if (error || !zip) return reject(new InvalidArchiveException());
        this.readEntries(zip, 0, 0, resolve, reject);
      });
    });
  }

  private readEntries(
    zip: ZipFile,
    entries: number,
    uncompressedSize: number,
    resolve: (result: ZipValidationResult) => void,
    reject: (error: Error) => void,
  ): void {
    let emittedEntry = false;
    zip.once('entry', (entry: Entry) => {
      emittedEntry = true;
      const nextEntries = entries + 1;
      const nextSize = uncompressedSize + entry.uncompressedSize;
      try {
        this.validateEntry(entry, nextEntries, nextSize);
      } catch (error) {
        zip.close();
        reject(error as Error);
        return;
      }

      zip.openReadStream(entry, (error, stream) => {
        if (error || !stream) {
          zip.close();
          reject(new InvalidArchiveException());
          return;
        }
        stream.on('error', () => {
          zip.close();
          reject(new InvalidArchiveException());
        });
        stream.resume();
        stream.on('end', () => {
          zip.removeAllListeners('entry');
          this.readEntries(zip, nextEntries, nextSize, resolve, reject);
        });
      });
    });
    zip.once('end', () => {
      if (!emittedEntry) {
        if (entries === 0) reject(new InvalidArchiveException('Archive is empty'));
        else resolve({ entries, uncompressedSize });
      }
    });
    zip.once('error', () => reject(new InvalidArchiveException()));
    zip.readEntry();
  }

  private validateEntry(entry: Entry, entries: number, uncompressedSize: number): void {
    if (entries > UPLOAD_MAX_ENTRIES || uncompressedSize > UPLOAD_MAX_UNCOMPRESSED_BYTES) {
      throw new ZipBombDetectedException();
    }
    const normalized = entry.fileName.replaceAll('\\', '/');
    const lowerCasePath = normalized.toLowerCase();
    const fileName = lowerCasePath.split('/').at(-1) ?? '';
    if (lowerCasePath.split('/').includes('..') || UPLOAD_FORBIDDEN_FILES.includes(fileName)) {
      throw new InvalidArchiveException('Archive contains a forbidden path');
    }
    const ignoredPath = UPLOAD_IGNORED_PATHS.some(
      (path) => lowerCasePath === path.slice(0, -1) || lowerCasePath.startsWith(path),
    );
    if (
      entry.compressedSize > 0 &&
      entry.uncompressedSize / entry.compressedSize > UPLOAD_MAX_COMPRESSION_RATIO
    ) {
      throw new ZipBombDetectedException();
    }
    // The parser deliberately ignores generated/dependency and repository
    // metadata directories. Keep them uploadable so users can zip a working
    // tree, while still validating their size and compression ratio above.
    if (ignoredPath) return;
  }
}
