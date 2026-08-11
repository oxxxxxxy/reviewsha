import { Injectable, Logger } from '@nestjs/common';
import { createLogEntry, formatLogEntry, type LogLevel, type LogMetadata } from '@reviewsha/config';

@Injectable()
export class WorkerLoggerService {
  private readonly logger = new Logger('ReviewshaWorker');
  private readonly serviceName = 'WORKER';

  debug(message: string, context = 'Worker', metadata?: LogMetadata): void {
    this.logger.log(this.format('DEBUG', message, context, metadata));
  }

  log(message: string, context = 'Worker', metadata?: LogMetadata): void {
    this.logger.log(this.format('INFO', message, context, metadata));
  }

  warn(message: string, context = 'Worker', metadata?: LogMetadata): void {
    this.logger.warn(this.format('WARN', message, context, metadata));
  }

  error(message: string, trace?: string, context = 'Worker', metadata?: LogMetadata): void {
    this.logger.error(this.format('ERROR', message, context, metadata), trace);
  }

  fatal(message: string, trace?: string, context = 'Worker', metadata?: LogMetadata): void {
    this.logger.error(this.format('FATAL', message, context, metadata), trace);
  }

  format(level: LogLevel, message: string, context: string, metadata?: LogMetadata): string {
    return formatLogEntry(
      createLogEntry({
        service: this.serviceName,
        level,
        context,
        message,
        ...(metadata ?? {}),
      }),
    );
  }
}
