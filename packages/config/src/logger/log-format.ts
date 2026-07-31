export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  readonly timestamp: string;
  readonly service: string;
  readonly level: LogLevel;
  readonly context: string;
  readonly message: string;
}

export function createLogEntry(
  input: Omit<LogEntry, 'timestamp'> & { readonly timestamp?: string },
): LogEntry {
  return {
    timestamp: input.timestamp ?? new Date().toISOString(),
    service: input.service,
    level: input.level,
    context: input.context,
    message: input.message,
  };
}

export function formatLogEntry(entry: LogEntry): string {
  return `[${entry.timestamp}] ${entry.service} ${entry.level} ${entry.context} ${entry.message}`;
}
