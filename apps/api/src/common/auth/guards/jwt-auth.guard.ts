import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UserRepository } from '../../../repositories/user/user.repository';
import { TokenService } from '../../../modules/auth/services/token.service';
import { ApiLoggerService } from '../../logger/api-logger.service';
import { IS_PUBLIC_KEY } from '../constants/auth.constants';
import type { AuthenticatedUser } from '../types/auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly userRepository: UserRepository,
    private readonly reflector: Reflector,
    private readonly logger: ApiLoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractBearerToken(request);
    const payload = await this.tokenService.verifyAccessToken(token);
    const user = await this.userRepository.findById(payload.sub);

    if (!user || !user.isActive) {
      this.logger.warn(`JWT authentication failed for userId=${payload.sub}`, 'JwtAuthGuard');
      throw new UnauthorizedException('User is not active');
    }

    request.user = { id: user.id, email: user.email, role: user.role, jti: payload.jti };
    this.logger.log(`JWT authentication succeeded for userId=${user.id}`, 'JwtAuthGuard');
    return true;
  }

  private extractBearerToken(request: Request): string {
    const authorization = request.headers.authorization;
    if (!authorization) {
      this.logger.warn('JWT authentication failed: missing Authorization header', 'JwtAuthGuard');
      throw new UnauthorizedException('Authorization header is required');
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      this.logger.warn('JWT authentication failed: invalid Authorization header', 'JwtAuthGuard');
      throw new UnauthorizedException('Bearer token is required');
    }

    return token;
  }
}
