import { Injectable } from '@nestjs/common';

export interface AdminLogEntry {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  service: string;
  context: string;
  message: string;
  event?: string;
  requestId?: string;
  userId?: string;
  projectId?: string;
  jobId?: string;
  metadata?: Record<string, unknown>;
  stack?: string;
}

@Injectable()
export class AdminLogSink {
  private writer?: (entry: AdminLogEntry) => Promise<void>;

  setWriter(writer: (entry: AdminLogEntry) => Promise<void>): void {
    this.writer = writer;
  }

  clearWriter(): void {
    this.writer = undefined;
  }

  write(entry: AdminLogEntry): void {
    void this.writer?.(entry).catch(() => undefined);
  }
}
