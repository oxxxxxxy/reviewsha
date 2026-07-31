import { Inject, Injectable } from '@nestjs/common';
import type { INestApplicationContext } from '@nestjs/common';

import { WorkerLoggerService } from '../logger/worker-logger.service';

@Injectable()
export class ShutdownService {
  private isShuttingDown = false;

  constructor(@Inject(WorkerLoggerService) private readonly logger: WorkerLoggerService) {}

  bind(app: INestApplicationContext): void {
    const shutdown = async (signal: NodeJS.Signals) => {
      if (this.isShuttingDown) {
        return;
      }

      this.isShuttingDown = true;
      this.logger.log(`Received ${signal}. Graceful shutdown started`, 'Shutdown');
      await app.close();
      this.logger.log('Graceful shutdown completed', 'Shutdown');
      process.exit(0);
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  }
}
