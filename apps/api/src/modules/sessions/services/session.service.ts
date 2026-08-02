import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RefreshToken, User } from '@prisma/client';
import { RefreshTokenRevokedReason } from '@prisma/client';
import { ApiLoggerService } from '../../../common/logger/api-logger.service';
import { RefreshTokenRepository } from '../../../repositories/auth/refresh-token.repository';
import type { TokenPair } from '../../auth/interfaces';
import type { RefreshTokenPayload } from '../../auth/interfaces/refresh-token.interface';
import { TokenService } from '../../auth/services/token.service';
import type { SessionResponseDto } from '../dto/session-response.dto';
import type { SessionContext } from '../interfaces/session-context.interface';
import { SessionMapper } from '../mappers/session.mapper';

@Injectable()
export class SessionService {
  private readonly maxSessionsPerUser: number;

  constructor(
    private readonly sessions: RefreshTokenRepository,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly logger: ApiLoggerService,
  ) {
    this.maxSessionsPerUser = this.configService.get<number>('sessions.maxSessionsPerUser') ?? 10;
  }

  async createSession(
    user: Pick<User, 'id' | 'email' | 'role'>,
    context: SessionContext = {},
  ): Promise<TokenPair> {
    const tokens = await this.tokenService.generateTokenPair(user);
    const payload = this.tokenService.decodeToken<RefreshTokenPayload>(tokens.refreshToken);

    if (!payload?.jti) {
      throw new UnauthorizedException('Refresh token payload is invalid');
    }

    await this.sessions.create({
      user: { connect: { id: user.id } },
      tokenHash: await this.tokenService.hashRefreshToken(tokens.refreshToken),
      jti: payload.jti,
      expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
      userAgent: context.userAgent,
      ip: context.ip,
      browser: this.detectBrowser(context.userAgent),
      os: this.detectOs(context.userAgent),
    });
    await this.sessions.enforceSessionLimit(
      user.id,
      this.maxSessionsPerUser,
      RefreshTokenRevokedReason.ADMIN_REVOKED,
    );

    this.logger.log(`Session created for userId=${user.id} jti=${payload.jti}`, 'SessionService');
    return tokens;
  }

  async rotateSession(
    user: Pick<User, 'id' | 'email' | 'role'>,
    refreshToken: string,
    jti: string,
    context: SessionContext = {},
  ): Promise<TokenPair> {
    const currentSession = await this.validateRefreshSession(user.id, refreshToken, jti, context);
    const tokens = await this.createSession(user, context);
    await this.sessions.revokeById(currentSession.id, RefreshTokenRevokedReason.ROTATION);
    this.logger.log(`Session rotated for userId=${user.id} jti=${jti}`, 'SessionService');
    return tokens;
  }

  async revokeSessionByToken(userId: string, refreshToken: string, jti: string): Promise<void> {
    const session = await this.validateRefreshSession(userId, refreshToken, jti);
    await this.sessions.revokeById(session.id, RefreshTokenRevokedReason.LOGOUT);
    this.logger.log(`Session revoked for userId=${userId} jti=${jti}`, 'SessionService');
  }

  async revokeAllSessions(
    userId: string,
    reason: RefreshTokenRevokedReason = RefreshTokenRevokedReason.LOGOUT_ALL,
  ): Promise<void> {
    await this.sessions.revokeAll(userId, reason);
    this.logger.log(`All sessions revoked for userId=${userId}`, 'SessionService');
  }

  async listSessions(userId: string, currentJti?: string): Promise<SessionResponseDto[]> {
    const sessions = await this.sessions.findActiveByUserId(userId);
    return sessions.map((session) => SessionMapper.toResponse(session, currentJti));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessions.findById(sessionId);
    if (!session || session.userId !== userId || session.revokedAt) {
      throw new NotFoundException('Session not found');
    }

    await this.sessions.revokeById(session.id, RefreshTokenRevokedReason.LOGOUT);
    this.logger.log(
      `Session revoked by id for userId=${userId} sessionId=${sessionId}`,
      'SessionService',
    );
  }

  async cleanupExpiredSessions(now = new Date()): Promise<number> {
    const result = await this.sessions.deleteExpired(now);
    this.logger.log(`Expired sessions cleaned: ${result.count}`, 'SessionService');
    return result.count;
  }

  async validateRefreshSession(
    userId: string,
    refreshToken: string,
    jti: string,
    context: SessionContext = {},
  ): Promise<RefreshToken> {
    const session = await this.sessions.findByJti(jti);

    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Refresh token session not found');
    }

    if (session.revokedAt) {
      await this.revokeAllSessions(userId, RefreshTokenRevokedReason.REUSE_DETECTED);
      this.logger.warn(
        `Refresh token reuse detected for userId=${userId} jti=${jti}`,
        'SessionService',
      );
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const tokenMatches = await this.tokenService.verifyRefreshTokenHash(
      session.tokenHash,
      refreshToken,
    );
    if (!tokenMatches) {
      await this.revokeAllSessions(userId, RefreshTokenRevokedReason.REUSE_DETECTED);
      throw new UnauthorizedException('Refresh token hash mismatch');
    }

    await this.sessions.updateActivity(session.id, {
      lastUsedAt: new Date(),
      lastIp: context.ip,
      lastUserAgent: context.userAgent,
    });

    return session;
  }

  private detectBrowser(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edg/')) return 'Edge';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    return 'Unknown Browser';
  }

  private detectOs(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    return 'Unknown OS';
  }
}
