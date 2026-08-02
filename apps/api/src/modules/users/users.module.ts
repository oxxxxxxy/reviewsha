import { Module } from '@nestjs/common';
import { ApiLoggerService } from '../../common/logger/api-logger.service';
import { DatabaseModule } from '../../database/database.module';
import { RepositoriesModule } from '../../repositories';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';

@Module({
  imports: [DatabaseModule, RepositoriesModule],
  controllers: [UsersController],
  providers: [ApiLoggerService, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
