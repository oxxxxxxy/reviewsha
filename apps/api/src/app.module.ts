import { Module } from '@nestjs/common';

import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { RepositoriesModule } from './repositories';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, RepositoriesModule, UsersModule, HealthModule],
})
export class AppModule {}
