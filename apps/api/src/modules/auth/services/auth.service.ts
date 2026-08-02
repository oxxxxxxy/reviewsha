import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { User } from '@prisma/client';
import { ApiLoggerService } from '../../../common/logger/api-logger.service';
import { RefreshTokenRepository } from '../../../repositories/auth/refresh-token.repository';
import { UserRepository } from '../../../repositories/user/user.repository';
import { UserMapper } from '../../users/mappers/user.mapper';
import type { UserResponseDto } from '../../users/dto/user-response.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import type { AuthResponseDto, TokenPairDto } from '../dto/auth-response.dto';
import type { AuthenticatedRefreshUser, AuthenticatedUser } from '../types/auth.types';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokenService: TokenService,
    private readonly logger: ApiLoggerService,
  ) {}

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
    await this.refreshTokens.revoke(this.tokenService.hashRefreshToken(refreshToken));
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
    const tokens = await this.issueTokenPair(dbUser);
    await this.refreshTokens.revoke(this.tokenService.hashRefreshToken(user.refreshToken));

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
    return this.tokenService.hashRefreshToken(token);
  }

  generateAccessToken(user: User): Promise<string> {
    return this.tokenService.generateAccessToken(user);
  }

  generateRefreshToken(user: User): Promise<string> {
    return this.tokenService.generateRefreshToken(user);
  }

  private async issueTokenPair(user: User): Promise<TokenPairDto> {
    const tokens = await this.tokenService.generateTokenPair(user);

    await this.refreshTokens.create({
      user: { connect: { id: user.id } },
      tokenHash: this.tokenService.hashRefreshToken(tokens.refreshToken),
      expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
    });

    return tokens;
  }

  private async assertRefreshTokenActive(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
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
}
