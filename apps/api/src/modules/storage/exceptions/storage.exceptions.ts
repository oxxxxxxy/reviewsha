export class StorageUnavailableException extends Error {
  constructor(message = 'Object storage is unavailable') {
    super(message);
    this.name = 'StorageUnavailableException';
  }
}

export class ObjectNotFoundException extends Error {
  constructor(message = 'Storage object was not found') {
    super(message);
    this.name = 'ObjectNotFoundException';
  }
}

export class UploadFailedException extends Error {
  constructor(message = 'Storage upload failed') {
    super(message);
    this.name = 'UploadFailedException';
  }
}

export class DownloadFailedException extends Error {
  constructor(message = 'Storage download failed') {
    super(message);
    this.name = 'DownloadFailedException';
  }
}

export class InvalidBucketException extends Error {
  constructor(bucket: string) {
    super(`Invalid storage bucket: ${bucket}`);
    this.name = 'InvalidBucketException';
  }
}
