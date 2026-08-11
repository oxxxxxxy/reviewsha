import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { createLogEntry, formatLogEntry, type LogLevel, type LogMetadata } from '@reviewsha/config';
import { AdminLogSink } from '../../database/admin-log-sink';

@Injectable()
export class ApiLoggerService {
  private readonly logger = new Logger('ReviewshaApi');
  private readonly serviceName = 'API';

  constructor(@Optional() @Inject(AdminLogSink) private readonly logSink?: AdminLogSink) {}

  debug(message: string, context = 'Api', metadata?: LogMetadata): void {
    this.write('DEBUG', message, context, undefined, metadata);
  }

  log(message: string, context = 'Api', metadata?: LogMetadata): void {
    this.write('INFO', message, context, undefined, metadata);
  }

  warn(message: string, context = 'Api', metadata?: LogMetadata): void {
    this.write('WARN', message, context, undefined, metadata);
  }

  error(message: string, trace?: string, context = 'Api', metadata?: LogMetadata): void {
    this.write('ERROR', message, context, trace, metadata);
  }

  fatal(message: string, trace?: string, context = 'Api', metadata?: LogMetadata): void {
    this.write('FATAL', message, context, trace, metadata);
  }

  private write(
    level: LogLevel,
    message: string,
    context: string,
    stack?: string,
    metadata?: LogMetadata,
  ): void {
    const safeMessage = this.mask(message);
    const safeStack = stack ? this.mask(stack) : undefined;
    const entry = createLogEntry({
      service: this.serviceName,
      level,
      context,
      message: safeMessage,
      ...(metadata ? this.maskMetadata(metadata) : {}),
    });
    this.logger[
      level === 'ERROR' || level === 'FATAL' ? 'error' : level === 'WARN' ? 'warn' : 'log'
    ](formatLogEntry(entry), safeStack);
    this.logSink?.write({
      level,
      service: this.serviceName,
      context,
      message: safeMessage,
      ...(safeStack ? { stack: safeStack } : {}),
      ...this.maskMetadata(metadata ?? {}),
    });
  }

  private maskMetadata(metadata: LogMetadata): Record<string, unknown> {
    const safe = { ...metadata };
    for (const key of Object.keys(safe)) {
      if (/(authorization|token|password|secret|api[_-]?key)/iu.test(key)) {
        safe[key] = '[REDACTED]';
      }
    }
    return safe;
  }

  format(level: LogLevel, message: string, context: string, metadata?: LogMetadata): string {
    return formatLogEntry(
      createLogEntry({
        service: this.serviceName,
        level,
        context,
        message: this.mask(message),
        ...(metadata ? this.maskMetadata(metadata) : {}),
      }),
    );
  }

  private mask(value: string): string {
    return value.replace(
      /(authorization|token|password|secret|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi,
      '$1=[REDACTED]',
    );
  }
}
