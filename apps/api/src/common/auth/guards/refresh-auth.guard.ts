import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserRepository } from '../../../repositories/user/user.repository';
import { TokenService } from '../../../modules/auth/services/token.service';
import type { AuthenticatedRefreshUser } from '../types/auth.types';

@Injectable()
export class RefreshAuthGuard implements CanActivate {
  constructor(
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(UserRepository) private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedRefreshUser }>();
    const refreshToken = this.extractRefreshToken(request);
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    const user = await this.userRepository.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is not active');
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      jti: payload.jti,
      refreshToken,
    };
    return true;
  }

  private extractRefreshToken(request: Request): string {
    const body = request.body as { refreshToken?: string } | undefined;
    if (!body?.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    return body.refreshToken;
  }
}
