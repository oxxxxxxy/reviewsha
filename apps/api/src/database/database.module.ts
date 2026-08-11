import { Global, Module } from '@nestjs/common';

import { ApiLoggerService } from '../common/logger/api-logger.service';
import { AppConfigModule } from '../config/config.module';
import { PrismaService } from './prisma.service';
import { AdminLogSink } from './admin-log-sink';
import { AuditLogService } from './audit-log.service';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [AdminLogSink, ApiLoggerService, PrismaService, AuditLogService],
  exports: [PrismaService, AuditLogService],
})
export class DatabaseModule {}
