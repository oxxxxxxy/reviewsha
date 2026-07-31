import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WorkerLoggerService {
  private readonly logger = new Logger('ReviewshaWorker');

  log(message: string, context?: string): void {
    this.logger.log(this.format(message, context));
  }

  warn(message: string, context?: string): void {
    this.logger.warn(this.format(message, context));
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(this.format(message, context), trace);
  }

  private format(message: string, context?: string): string {
    return context ? `[${context}] ${message}` : message;
  }
}
