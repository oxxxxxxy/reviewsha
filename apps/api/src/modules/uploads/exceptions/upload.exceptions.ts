import { UnprocessableEntityException } from '@nestjs/common';

export class InvalidFileTypeException extends UnprocessableEntityException {
  constructor() {
    super('Unsupported file type. Upload a supported archive, source file, document, or PDF.');
    this.name = 'InvalidFileTypeException';
  }
}

export class FileTooLargeException extends UnprocessableEntityException {
  constructor() {
    super('Upload exceeds the maximum allowed size');
    this.name = 'FileTooLargeException';
  }
}

export class InvalidArchiveException extends UnprocessableEntityException {
  constructor(message = 'Archive is corrupted or invalid') {
    super(message);
    this.name = 'InvalidArchiveException';
  }
}

export class ZipBombDetectedException extends UnprocessableEntityException {
  constructor() {
    super('Archive compression ratio or unpacked size is unsafe');
    this.name = 'ZipBombDetectedException';
  }
}

export class UploadFailedException extends UnprocessableEntityException {
  constructor() {
    super('Upload could not be completed');
    this.name = 'UploadFailedException';
  }
}
