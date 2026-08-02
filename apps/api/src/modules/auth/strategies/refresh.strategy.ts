import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { UserRepository } from '../../../repositories/user/user.repository';
import type { JwtConfig } from '../../../config/jwt.config';
import type {
  AuthenticatedRefreshUser,
  JwtRefreshPayload,
} from '../../../common/auth/types/auth.types';

function extractRefreshToken(request: Request): string | null {
  const body = request.body as { refreshToken?: string } | undefined;
  return body?.refreshToken ?? null;
}

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(UserRepository) private readonly userRepository: UserRepository,
  ) {
    const jwtConfig = configService.getOrThrow<JwtConfig>('jwt');
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractRefreshToken]),
      passReqToCallback: true,
      ignoreExpiration: false,
      secretOrKey: jwtConfig.refresh.secret,
      issuer: jwtConfig.refresh.issuer,
      audience: jwtConfig.refresh.audience,
      algorithms: [jwtConfig.refresh.algorithm],
    });
  }

  async validate(request: Request, payload: JwtRefreshPayload): Promise<AuthenticatedRefreshUser> {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshToken = extractRefreshToken(request);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is not active');
    }

    return { id: user.id, email: user.email, role: user.role, refreshToken };
  }
}
