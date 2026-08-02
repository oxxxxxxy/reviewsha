import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import type { User } from '@prisma/client';
import { ApiLoggerService } from '../../../common/logger/api-logger.service';
import type { JwtConfig } from '../../../config/jwt.config';
import { toJwtSignOptions, toJwtVerifyOptions } from '../../../config/jwt.config';
import {
  ACCESS_TOKEN_TYPE,
  REFRESH_TOKEN_TYPE,
} from '../../../common/auth/constants/auth.constants';
import type { AccessTokenPayload, RefreshTokenPayload, TokenPair } from '../interfaces';

@Injectable()
export class TokenService {
  private readonly jwtConfig: JwtConfig;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: ApiLoggerService,
  ) {
    this.jwtConfig = this.configService.getOrThrow<JwtConfig>('jwt');
  }

  async generateAccessToken(user: Pick<User, 'id' | 'email' | 'role'>): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: ACCESS_TOKEN_TYPE,
      jti: randomUUID(),
    };

    const token = await this.jwtService.signAsync(payload, toJwtSignOptions(this.jwtConfig.access));
    this.logger.log(
      `Access token generated for userId=${user.id} jti=${payload.jti}`,
      'TokenService',
    );
    return token;
  }

  async generateRefreshToken(user: Pick<User, 'id' | 'email' | 'role'>): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: REFRESH_TOKEN_TYPE,
      jti: randomUUID(),
    };

    const token = await this.jwtService.signAsync(
      payload,
      toJwtSignOptions(this.jwtConfig.refresh),
    );
    this.logger.log(
      `Refresh token generated for userId=${user.id} jti=${payload.jti}`,
      'TokenService',
    );
    return token;
  }

  async generateTokenPair(user: Pick<User, 'id' | 'email' | 'role'>): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);
    this.logger.log(`Token pair generated for userId=${user.id}`, 'TokenService');
    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        toJwtVerifyOptions(this.jwtConfig.access),
      );
      if (payload.type !== ACCESS_TOKEN_TYPE) {
        throw new UnauthorizedException('Invalid access token type');
      }
      this.logger.log(
        `Access token verified for userId=${payload.sub} jti=${payload.jti}`,
        'TokenService',
      );
      return payload;
    } catch (error) {
      throw this.mapJwtError(error, 'access');
    }
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        token,
        toJwtVerifyOptions(this.jwtConfig.refresh),
      );
      if (payload.type !== REFRESH_TOKEN_TYPE) {
        throw new UnauthorizedException('Invalid refresh token type');
      }
      this.logger.log(
        `Refresh token verified for userId=${payload.sub} jti=${payload.jti}`,
        'TokenService',
      );
      return payload;
    } catch (error) {
      throw this.mapJwtError(error, 'refresh');
    }
  }

  decodeToken<T extends object = Record<string, unknown>>(token: string): T | null {
    const decoded = this.jwtService.decode(token);
    return decoded && typeof decoded === 'object' ? (decoded as T) : null;
  }

  async hashRefreshToken(token: string): Promise<string> {
    return argon2.hash(token);
  }

  async verifyRefreshTokenHash(tokenHash: string, token: string): Promise<boolean> {
    try {
      return await argon2.verify(tokenHash, token);
    } catch {
      return false;
    }
  }

  getRefreshTokenExpiresAt(): Date {
    const ttlMs = this.parseDurationMs(this.jwtConfig.refresh.expiresIn);
    if (ttlMs <= 0) {
      throw new UnauthorizedException('Invalid refresh token ttl');
    }
    return new Date(Date.now() + ttlMs);
  }

  mapJwtError(error: unknown, tokenKind: 'access' | 'refresh'): UnauthorizedException {
    if (error instanceof UnauthorizedException) {
      return error;
    }

    if (error instanceof TokenExpiredError) {
      this.logger.warn(`${tokenKind} token expired`, 'TokenService');
      return new UnauthorizedException(`${tokenKind} token expired`);
    }

    if (error instanceof JsonWebTokenError) {
      this.logger.warn(`${tokenKind} token verification failed: ${error.name}`, 'TokenService');
      return new UnauthorizedException(`Invalid ${tokenKind} token`);
    }

    this.logger.warn(`${tokenKind} token verification failed`, 'TokenService');
    return new UnauthorizedException(`Invalid ${tokenKind} token`);
  }

  private parseDurationMs(value: string): number {
    const match = /^(\d+)(s|m|h|d)$/.exec(value);
    if (!match) {
      const seconds = Number(value);
      return Number.isFinite(seconds) ? seconds * 1000 : 0;
    }

    const amount = Number(match[1]);
    const unit = match[2] ?? 's';
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return amount * (multipliers[unit] ?? 0);
  }
}
