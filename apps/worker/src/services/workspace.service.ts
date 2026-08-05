import { Injectable } from '@nestjs/common';
import { FilesystemService } from './filesystem.service';

@Injectable()
export class WorkspaceService {
  constructor(private readonly filesystem: FilesystemService) {}

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
