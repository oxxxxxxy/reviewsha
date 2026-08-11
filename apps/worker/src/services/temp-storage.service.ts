import { Inject, Injectable } from '@nestjs/common';
import { FilesystemService } from './filesystem.service';

@Injectable()
export class TempStorageService {
  private readonly filesystem: FilesystemService;

  constructor(@Inject(FilesystemService) filesystem: FilesystemService) {
    this.filesystem = filesystem;
  }

  create(jobId: string) {
    return this.filesystem.createWorkspace(jobId);
  }

  cleanup(jobId: string): Promise<void> {
    return this.filesystem.removeWorkspace(jobId);
  }
}
