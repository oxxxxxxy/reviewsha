import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ApiLoggerService } from '../../common/logger/api-logger.service';
import type { JwtConfig } from '../../config/jwt.config';
import { AppConfigModule } from '../../config/config.module';
import { DatabaseModule } from '../../database/database.module';
import { RepositoriesModule } from '../../repositories';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';

@Module({
  imports: [
    UsersModule,
    SessionsModule,
    DatabaseModule,
    RepositoriesModule,
    AppConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtConfig = configService.getOrThrow<JwtConfig>('jwt');
        return {
          secret: jwtConfig.access.secret,
          signOptions: {
            issuer: jwtConfig.access.issuer,
            audience: jwtConfig.access.audience,
            algorithm: jwtConfig.access.algorithm,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    ApiLoggerService,
    AuthService,
    TokenService,
    JwtStrategy,
    RefreshStrategy,
    JwtAuthGuard,
    RefreshAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, TokenService, JwtStrategy, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
