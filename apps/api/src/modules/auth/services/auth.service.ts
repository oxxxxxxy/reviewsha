import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import type { User } from '@prisma/client';
import { ApiLoggerService } from '../../../common/logger/api-logger.service';
import type { JwtConfig } from '../../../config/app.config';
import { RefreshTokenRepository } from '../../../repositories/auth/refresh-token.repository';
import { UserRepository } from '../../../repositories/user/user.repository';
import { UserMapper } from '../../users/mappers/user.mapper';
import type { UserResponseDto } from '../../users/dto/user-response.dto';
import { ACCESS_TOKEN_TYPE, REFRESH_TOKEN_TYPE } from '../constants/auth.constants';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import type { AuthResponseDto, TokenPairDto } from '../dto/auth-response.dto';
import type {
  AuthenticatedRefreshUser,
  AuthenticatedUser,
  JwtAccessPayload,
  JwtRefreshPayload,
} from '../types/auth.types';

@Injectable()
export class AuthService {
  private readonly jwtConfig: JwtConfig;

  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: ApiLoggerService,
  ) {
    this.jwtConfig = this.configService.getOrThrow<JwtConfig>('jwt');
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = this.normalizeEmail(dto.email);
    const existing = await this.users.findByEmail(email);

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const user = await this.users.create({
      email,
      passwordHash: await this.hashPassword(dto.password),
      displayName: dto.displayName.trim(),
    });
    const tokens = await this.issueTokenPair(user);

    this.logger.log(`User registered: ${user.id}`, 'AuthService');
    return { ...tokens, user: UserMapper.toResponse(user) };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.users.findByEmail(email);

    if (!user) {
      this.logger.warn(`Failed login for unknown email: ${email}`, 'AuthService');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      this.logger.warn(`Failed login for inactive user: ${user.id}`, 'AuthService');
      throw new UnauthorizedException('User is not active');
    }

    const passwordValid = await this.verifyPassword(user.passwordHash, dto.password);
    if (!passwordValid) {
      this.logger.warn(`Failed login for user: ${user.id}`, 'AuthService');
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokenPair(user);
    this.logger.log(`User logged in: ${user.id}`, 'AuthService');
    return { ...tokens, user: UserMapper.toResponse(user) };
  }

  async logout(user: AuthenticatedUser, refreshToken: string): Promise<void> {
    await this.assertRefreshTokenActive(user.id, refreshToken);
    await this.refreshTokens.revoke(this.hashToken(refreshToken));
    this.logger.log(`User logged out: ${user.id}`, 'AuthService');
  }

  async logoutAll(user: AuthenticatedUser): Promise<void> {
    await this.refreshTokens.revokeAll(user.id);
    this.logger.log(`User logged out from all devices: ${user.id}`, 'AuthService');
  }

  async refresh(user: AuthenticatedRefreshUser): Promise<AuthResponseDto> {
    const dbUser = await this.users.findById(user.id);
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }
    if (!dbUser.isActive) {
      throw new UnauthorizedException('User is not active');
    }

    await this.assertRefreshTokenActive(user.id, user.refreshToken);
    await this.refreshTokens.revoke(this.hashToken(user.refreshToken));

    const tokens = await this.issueTokenPair(dbUser);
    this.logger.log(`Tokens refreshed for user: ${dbUser.id}`, 'AuthService');
    return { ...tokens, user: UserMapper.toResponse(dbUser) };
  }

  async me(user: AuthenticatedUser): Promise<UserResponseDto> {
    const dbUser = await this.users.findById(user.id);
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }
    if (!dbUser.isActive) {
      throw new UnauthorizedException('User is not active');
    }

    return UserMapper.toResponse(dbUser);
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  async verifyPassword(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async generateAccessToken(user: User): Promise<string> {
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: ACCESS_TOKEN_TYPE,
      jti: randomUUID(),
    };

    return this.jwtService.signAsync(payload, {
      secret: this.jwtConfig.secret,
      expiresIn: this.jwtConfig.expiresIn as JwtSignOptions['expiresIn'],
      issuer: this.jwtConfig.issuer,
      audience: this.jwtConfig.audience,
    });
  }

  async generateRefreshToken(user: User): Promise<string> {
    const payload: JwtRefreshPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: REFRESH_TOKEN_TYPE,
      jti: randomUUID(),
    };

    return this.jwtService.signAsync(payload, {
      secret: this.jwtConfig.refreshSecret,
      expiresIn: this.jwtConfig.refreshExpiresIn as JwtSignOptions['expiresIn'],
      issuer: this.jwtConfig.issuer,
      audience: this.jwtConfig.audience,
    });
  }

  private async issueTokenPair(user: User): Promise<TokenPairDto> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    await this.refreshTokens.create({
      user: { connect: { id: user.id } },
      tokenHash: this.hashToken(refreshToken),
      expiresAt: this.getRefreshTokenExpiresAt(),
    });

    return { accessToken, refreshToken };
  }

  private async assertRefreshTokenActive(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokens.findByHash(tokenHash);

    if (!stored || stored.userId !== userId || stored.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private getRefreshTokenExpiresAt(): Date {
    const ttlMs = this.parseDurationMs(this.jwtConfig.refreshExpiresIn);
    if (ttlMs <= 0) {
      throw new UnprocessableEntityException('Invalid refresh token ttl');
    }

    return new Date(Date.now() + ttlMs);
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
