export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export type LogMetadata = Readonly<Record<string, unknown>>;

export interface LogEntry {
  readonly timestamp: string;
  readonly service: string;
  readonly level: LogLevel;
  readonly context: string;
  readonly message: string;
  readonly event?: string;
  readonly requestId?: string;
  readonly userId?: string;
  readonly projectId?: string;
  readonly jobId?: string;
  readonly metadata?: LogMetadata;
}

export function createLogEntry(
  input: Omit<LogEntry, 'timestamp'> & { readonly timestamp?: string },
): LogEntry {
  return {
    ...input,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}

export function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}
