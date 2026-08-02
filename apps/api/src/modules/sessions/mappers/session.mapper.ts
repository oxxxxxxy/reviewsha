import type { RefreshToken } from '@prisma/client';
import { SessionResponseDto } from '../dto/session-response.dto';

export class SessionMapper {
  static toResponse(session: RefreshToken, currentJti?: string): SessionResponseDto {
    return {
      id: session.id,
      userId: session.userId,
      device: SessionMapper.deviceLabel(session.browser, session.os, session.userAgent),
      ip: session.lastIp ?? session.ip,
      userAgent: session.lastUserAgent ?? session.userAgent,
      browser: session.browser,
      os: session.os,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      current: Boolean(currentJti && session.jti === currentJti),
    };
  }

  private static deviceLabel(
    browser: string | null,
    os: string | null,
    fallback: string | null,
  ): string | null {
    if (browser && os) return `${browser} on ${os}`;
    if (browser) return browser;
    if (os) return os;
    return fallback;
  }
}
