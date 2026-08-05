import { Injectable } from '@nestjs/common';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class FilesystemService {
  readonly root = join(process.env.TMPDIR ?? '/tmp', 'reviewsha', 'jobs');

  jobDirectory(jobId: string): string {
    return join(this.root, jobId);
  }

  async createWorkspace(
    jobId: string,
  ): Promise<{ root: string; source: string; extracted: string; output: string }> {
    const root = this.jobDirectory(jobId);
    const workspace = {
      root,
      source: join(root, 'source'),
      extracted: join(root, 'extracted'),
      output: join(root, 'output'),
    };
    await Promise.all(
      Object.values(workspace).map((directory) => mkdir(directory, { recursive: true })),
    );
    return workspace;
  }

  removeWorkspace(jobId: string): Promise<void> {
    return rm(this.jobDirectory(jobId), { recursive: true, force: true });
  }
}
