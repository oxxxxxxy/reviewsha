import { UPLOAD_LIMITS } from '../constants/upload.js';

export function isAllowedUploadFileName(fileName: string): boolean {
  return UPLOAD_LIMITS.allowedExtensions.some((extension) =>
    fileName.toLowerCase().endsWith(extension),
  );
}

export function isBlockedPath(path: string): boolean {
  return UPLOAD_LIMITS.blockedDirectories.some((directory) => path.split('/').includes(directory));
}
