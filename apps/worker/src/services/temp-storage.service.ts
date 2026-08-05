import { Injectable } from '@nestjs/common';
import { FilesystemService } from './filesystem.service';

@Injectable()
export class TempStorageService {
  constructor(private readonly filesystem: FilesystemService) {}

  create(jobId: string) {
    return this.filesystem.createWorkspace(jobId);
  }

  cleanup(jobId: string): Promise<void> {
    return this.filesystem.removeWorkspace(jobId);
  }
}
