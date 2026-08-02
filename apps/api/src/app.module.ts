import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { JwtAuthGuard } from './common/auth/guards/jwt-auth.guard';
import { ApiLoggerService } from './common/logger/api-logger.service';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { RepositoriesModule } from './repositories';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { SessionsModule } from './modules/sessions/sessions.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RepositoriesModule,
    UsersModule,
    AuthModule,
    SessionsModule,
    HealthModule,
  ],
  providers: [ApiLoggerService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
