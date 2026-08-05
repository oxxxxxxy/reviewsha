import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

export class StorageUnavailableException extends ServiceUnavailableException {
  constructor(message = 'Object storage is unavailable') {
    super(message);
    this.name = 'StorageUnavailableException';
  }
}

export class ObjectNotFoundException extends NotFoundException {
  constructor(message = 'Storage object was not found') {
    super(message);
    this.name = 'ObjectNotFoundException';
  }
}

export class UploadFailedException extends ServiceUnavailableException {
  constructor(message = 'Storage upload failed') {
    super(message);
    this.name = 'UploadFailedException';
  }
}

export class DownloadFailedException extends ServiceUnavailableException {
  constructor(message = 'Storage download failed') {
    super(message);
    this.name = 'DownloadFailedException';
  }
}

export class InvalidBucketException extends ServiceUnavailableException {
  constructor(bucket: string) {
    super(`Invalid storage bucket: ${bucket}`);
    this.name = 'InvalidBucketException';
  }
}
