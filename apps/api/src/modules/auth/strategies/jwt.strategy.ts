import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from '../../../repositories/user/user.repository';
import type { JwtConfig } from '../../../config/app.config';
import type { AuthenticatedUser, JwtAccessPayload } from '../types/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    const jwtConfig = configService.getOrThrow<JwtConfig>('jwt');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is not active');
    }

    return { id: user.id, email: user.email, role: user.role };
  }
}
