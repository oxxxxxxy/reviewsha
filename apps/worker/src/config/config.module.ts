import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { validateWorkerEnv } from './env.schema';
import workerConfig from './worker.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      cache: true,
      expandVariables: true,
      load: [workerConfig],
      validate: validateWorkerEnv,
    }),
  ],
})
export class WorkerConfigModule {}
