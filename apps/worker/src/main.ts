import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { WorkerLoggerService } from './common/logger/worker-logger.service';
import { ShutdownService } from './common/shutdown/shutdown.service';
import type { WorkerConfig } from './config/worker.config';
import { QueueService } from './queue/queue.service';
import { WorkerModule } from './worker.module';
import { WorkerHealthService } from './health/worker-health.service';

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);

  const logger = app.get(WorkerLoggerService);
  const configService = app.get(ConfigService);
  const queueService = app.get(QueueService);
  const shutdownService = app.get(ShutdownService);
  const health = app.get(WorkerHealthService);
  const workerConfig = configService.getOrThrow<WorkerConfig>('worker');

  shutdownService.bind(app);

  logger.log('Worker started', workerConfig.workerName);
  await queueService.initialize();
  await health.check();
  logger.log('Worker dependencies healthy: PostgreSQL, Redis, MinIO', 'Bootstrap');
  logger.log(`Registered queues: ${queueService.getQueueNames().join(', ')}`, 'Bootstrap');
  logger.log('Waiting for jobs...', 'Bootstrap');

  setInterval(() => {
    // Keep standalone worker process alive while BullMQ workers wait for jobs.
  }, 60_000);
}

if (process.env.VITEST !== 'true') {
  void bootstrap();
}
