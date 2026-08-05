import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { JwtAuthGuard } from './common/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/auth/guards/roles.guard';
import { ApiLoggerService } from './common/logger/api-logger.service';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { RepositoriesModule } from './repositories';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { StorageModule } from './modules/storage/storage.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { QueueModule } from './modules/queue/queue.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RepositoriesModule,
    UsersModule,
    AuthModule,
    SessionsModule,
    ProjectsModule,
    StorageModule,
    UploadsModule,
    QueueModule,
    PipelineModule,
    ReportsModule,
    HealthModule,
  ],
  providers: [
    ApiLoggerService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
