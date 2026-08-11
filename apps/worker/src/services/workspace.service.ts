import { Inject, Injectable } from '@nestjs/common';
import { FilesystemService } from './filesystem.service';

@Injectable()
export class WorkspaceService {
  private readonly filesystem: FilesystemService;

  constructor(@Inject(FilesystemService) filesystem: FilesystemService) {
    this.filesystem = filesystem;
  }

  create(jobId: string) {
    return this.filesystem.createWorkspace(jobId);
  }
  path(jobId: string) {
    return this.filesystem.jobDirectory(jobId);
  }
  cleanup(jobId: string) {
    return this.filesystem.removeWorkspace(jobId);
  }
}
