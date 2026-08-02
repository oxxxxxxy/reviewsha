import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { ApiLoggerService } from '../../logger/api-logger.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(ApiLoggerService) private readonly logger: ApiLoggerService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedApiKey = this.configService.get<string>('security.internalApiKey');
    const providedApiKey = request.header('x-api-key');

    if (!expectedApiKey || providedApiKey !== expectedApiKey) {
      this.logger.warn('API key authentication failed', 'ApiKeyGuard');
      throw new UnauthorizedException('Invalid API key');
    }

    this.logger.log('API key authentication succeeded', 'ApiKeyGuard');
    return true;
  }
}
