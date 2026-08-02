import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ApiLoggerService } from '../../common/logger/api-logger.service';
import { AppConfigModule } from '../../config/config.module';
import type { JwtConfig } from '../../config/jwt.config';
import { RepositoriesModule } from '../../repositories';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TokenService } from '../auth/services/token.service';
import { SessionsController } from './controllers/sessions.controller';
import { SessionService } from './services/session.service';

@Module({
  imports: [
    AppConfigModule,
    RepositoriesModule,
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
  controllers: [SessionsController],
  providers: [ApiLoggerService, TokenService, JwtAuthGuard, SessionService],
  exports: [SessionService],
})
export class SessionsModule {}
