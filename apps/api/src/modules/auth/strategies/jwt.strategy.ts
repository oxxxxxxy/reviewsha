import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from '../../../repositories/user/user.repository';
import type { JwtConfig } from '../../../config/jwt.config';
import type { AuthenticatedUser, JwtAccessPayload } from '../../../common/auth/types/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(UserRepository) private readonly userRepository: UserRepository,
  ) {
    const jwtConfig = configService.getOrThrow<JwtConfig>('jwt');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.access.secret,
      issuer: jwtConfig.access.issuer,
      audience: jwtConfig.access.audience,
      algorithms: [jwtConfig.access.algorithm],
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
