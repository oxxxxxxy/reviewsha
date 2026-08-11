import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { User } from '@prisma/client';
import { ApiLoggerService } from '../../../common/logger/api-logger.service';
import { SessionService } from '../../sessions/services/session.service';
import type { SessionContext } from '../../sessions/interfaces/session-context.interface';
import { UserMapper } from '../../users/mappers/user.mapper';
import { UpdateUserDto } from '../../users/dto/update-user.dto';
import type { UserResponseDto } from '../../users/dto/user-response.dto';
import { LoginDto } from '../dto/login.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { RegisterDto } from '../dto/register.dto';
import type { AuthResponseDto } from '../dto/auth-response.dto';
import type {
  AuthenticatedRefreshUser,
  AuthenticatedUser,
} from '../../../common/auth/types/auth.types';
import { TokenService } from './token.service';
import { UserRepository } from '../../../repositories/user/user.repository';

@Injectable()
export class AuthService {
  constructor(
    @Inject(UserRepository) private readonly users: UserRepository,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(ApiLoggerService) private readonly logger: ApiLoggerService,
  ) {}

  async register(dto: RegisterDto, context: SessionContext = {}): Promise<AuthResponseDto> {
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
    const tokens = await this.sessions.createSession(user, context);

    this.logger.log(`User registered: ${user.id}`, 'AuthService');
    return { ...tokens, user: UserMapper.toResponse(user) };
  }

  async login(dto: LoginDto, context: SessionContext = {}): Promise<AuthResponseDto> {
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

    const tokens = await this.sessions.createSession(user, context);
    this.logger.log(`User logged in: ${user.id}`, 'AuthService');
    return { ...tokens, user: UserMapper.toResponse(user) };
  }

  async logout(user: AuthenticatedUser, refreshToken: string, jti?: string): Promise<void> {
    if (!jti) {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      jti = payload.jti;
    }
    await this.sessions.revokeSessionByToken(user.id, refreshToken, jti);
    this.logger.log(`User logged out: ${user.id}`, 'AuthService');
  }

  async logoutAll(user: AuthenticatedUser): Promise<void> {
    await this.sessions.revokeAllSessions(user.id);
    this.logger.log(`User logged out from all devices: ${user.id}`, 'AuthService');
  }

  async refresh(
    user: AuthenticatedRefreshUser,
    context: SessionContext = {},
  ): Promise<AuthResponseDto> {
    const dbUser = await this.users.findById(user.id);
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }
    if (!dbUser.isActive) {
      throw new UnauthorizedException('User is not active');
    }

    if (!user.jti) {
      throw new UnauthorizedException('Refresh token jti is required');
    }

    const tokens = await this.sessions.rotateSession(dbUser, user.refreshToken, user.jti, context);
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

  async updateMe(user: AuthenticatedUser, dto: UpdateUserDto): Promise<UserResponseDto> {
    const dbUser = await this.users.findById(user.id);
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }
    if (!dbUser.isActive) {
      throw new UnauthorizedException('User is not active');
    }

    const data: UpdateUserDto = {};
    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName.trim();
    }
    if (dto.avatarUrl !== undefined) {
      data.avatarUrl = dto.avatarUrl;
    }
    if (Object.keys(data).length === 0) {
      return UserMapper.toResponse(dbUser);
    }

    const updated = await this.users.update(user.id, data);
    this.logger.log(`Current user profile updated: ${user.id}`, 'AuthService');
    return UserMapper.toResponse(updated);
  }

  async changePassword(user: AuthenticatedUser, dto: ChangePasswordDto): Promise<void> {
    const dbUser = await this.users.findById(user.id);
    if (!dbUser || !dbUser.isActive) throw new UnauthorizedException('User is not active');
    if (!(await this.verifyPassword(dbUser.passwordHash, dto.currentPassword))) {
      throw new UnauthorizedException('Current password is invalid');
    }
    await this.users.update(user.id, { passwordHash: await this.hashPassword(dto.newPassword) });
    await this.sessions.revokeAllSessions(user.id);
    this.logger.log(`User password changed: ${user.id}`, 'AuthService');
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

  hashToken(token: string): Promise<string> {
    return this.tokenService.hashRefreshToken(token);
  }

  generateAccessToken(user: User): Promise<string> {
    return this.tokenService.generateAccessToken(user);
  }

  generateRefreshToken(user: User): Promise<string> {
    return this.tokenService.generateRefreshToken(user);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
