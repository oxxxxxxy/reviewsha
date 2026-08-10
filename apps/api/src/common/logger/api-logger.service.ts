import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { createLogEntry, formatLogEntry, type LogLevel } from '@reviewsha/config';
import { AdminLogSink } from '../../database/admin-log-sink';

@Injectable()
export class ApiLoggerService {
  private readonly logger = new Logger('ReviewshaApi');
  private readonly serviceName = 'API';

  constructor(@Optional() @Inject(AdminLogSink) private readonly logSink?: AdminLogSink) {}

  log(message: string, context = 'Api'): void {
    this.write('INFO', message, context);
  }

  warn(message: string, context = 'Api'): void {
    this.write('WARN', message, context);
  }

  error(message: string, trace?: string, context = 'Api'): void {
    this.write('ERROR', message, context, trace);
  }

  private write(level: LogLevel, message: string, context: string, stack?: string): void {
    this.logger[level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log'](
      this.format(level, message, context),
      stack,
    );
    this.logSink?.write({
      level,
      service: this.serviceName,
      context,
      message: this.mask(message),
      ...(stack ? { stack: this.mask(stack) } : {}),
    });
  }

  private mask(value: string): string {
    return value.replace(
      /(authorization|token|password|secret|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi,
      '$1=[REDACTED]',
    );
  }

  format(level: LogLevel, message: string, context: string): string {
    return formatLogEntry(
      createLogEntry({
        service: this.serviceName,
        level,
        context,
        message,
      }),
    );
  }
}
