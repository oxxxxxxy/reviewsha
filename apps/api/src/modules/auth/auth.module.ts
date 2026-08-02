import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ApiLoggerService } from '../../common/logger/api-logger.service';
import { AppConfigModule } from '../../config/config.module';
import { DatabaseModule } from '../../database/database.module';
import { RepositoriesModule } from '../../repositories';
import { UsersModule } from '../users/users.module';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';

@Module({
  imports: [
    UsersModule,
    DatabaseModule,
    RepositoriesModule,
    AppConfigModule,
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    ApiLoggerService,
    AuthService,
    JwtStrategy,
    RefreshStrategy,
    JwtAuthGuard,
    RefreshAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
