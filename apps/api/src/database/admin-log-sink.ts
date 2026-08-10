import { Injectable } from '@nestjs/common';

export interface AdminLogEntry {
  level: string;
  service: string;
  context: string;
  message: string;
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
