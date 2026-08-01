import { Global, Module } from '@nestjs/common';

import { ApiLoggerService } from '../common/logger/api-logger.service';
import { AppConfigModule } from '../config/config.module';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [ApiLoggerService, PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
