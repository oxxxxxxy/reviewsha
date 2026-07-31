import { Injectable, Logger } from '@nestjs/common';
import { createLogEntry, formatLogEntry, type LogLevel } from '@reviewsha/config';

@Injectable()
export class ApiLoggerService {
  private readonly logger = new Logger('ReviewshaApi');
  private readonly serviceName = 'API';

  log(message: string, context = 'Api'): void {
    this.logger.log(this.format('INFO', message, context));
  }

  warn(message: string, context = 'Api'): void {
    this.logger.warn(this.format('WARN', message, context));
  }

  error(message: string, trace?: string, context = 'Api'): void {
    this.logger.error(this.format('ERROR', message, context), trace);
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
