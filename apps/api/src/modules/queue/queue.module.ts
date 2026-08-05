import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ApiLoggerService } from '../../common/logger/api-logger.service';
import { QUEUE_NAME_LIST } from './queue.constants';
import { QueueEvents } from './queue.events';
import { QueueRegistry } from './queue.registry';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('redis.host'),
          port: config.getOrThrow<number>('redis.port'),
          password: config.get<string>('redis.password'),
          db: config.getOrThrow<number>('redis.db'),
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1_000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),
    BullModule.registerQueue(...QUEUE_NAME_LIST.map((name) => ({ name }))),
  ],
  providers: [ApiLoggerService, QueueEvents, QueueRegistry, QueueService],
  exports: [QueueEvents, QueueRegistry, QueueService],
})
export class QueueModule {}
