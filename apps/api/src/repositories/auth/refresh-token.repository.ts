import { Injectable } from '@nestjs/common';
import type { Prisma, RefreshToken, RefreshTokenRevokedReason } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseRepository,
  type BaseDelegate,
  type PrismaRepositoryClient,
} from '../base/base.repository';
import type { RepositoryOptions } from '../base/repository.interface';
import type { IRefreshTokenRepository } from './refresh-token.repository.interface';

@Injectable()
export class RefreshTokenRepository
  extends BaseRepository<RefreshToken>
  implements IRefreshTokenRepository
{
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(client: PrismaRepositoryClient): BaseDelegate<RefreshToken> {
    return client.refreshToken as unknown as BaseDelegate<RefreshToken>;
  }

  create(data: Prisma.RefreshTokenCreateInput, options?: RepositoryOptions): Promise<RefreshToken> {
    return this.getClient(options).refreshToken.create({ data });
  }

  findByHash(tokenHash: string, options?: RepositoryOptions): Promise<RefreshToken | null> {
    return this.getClient(options).refreshToken.findUnique({ where: { tokenHash } });
  }

  findByJti(jti: string, options?: RepositoryOptions): Promise<RefreshToken | null> {
    return this.getClient(options).refreshToken.findUnique({ where: { jti } });
  }

  findActiveByUserId(userId: string, options?: RepositoryOptions): Promise<RefreshToken[]> {
    return this.getClient(options).refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  revoke(
    tokenHash: string,
    reason: RefreshTokenRevokedReason | null = null,
    options?: RepositoryOptions,
  ): Promise<RefreshToken> {
    return this.getClient(options).refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  revokeById(
    id: string,
    reason: RefreshTokenRevokedReason | null = null,
    options?: RepositoryOptions,
  ): Promise<RefreshToken> {
    return this.getClient(options).refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  revokeAll(
    userId: string,
    reason: RefreshTokenRevokedReason | null = null,
    options?: RepositoryOptions,
  ): Promise<Prisma.BatchPayload> {
    return this.getClient(options).refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  updateActivity(
    id: string,
    data: Pick<Prisma.RefreshTokenUpdateInput, 'lastUsedAt' | 'lastIp' | 'lastUserAgent'>,
    options?: RepositoryOptions,
  ): Promise<RefreshToken> {
    return this.getClient(options).refreshToken.update({ where: { id }, data });
  }

  async enforceSessionLimit(
    userId: string,
    maxSessions: number,
    reason: RefreshTokenRevokedReason | null = null,
    options?: RepositoryOptions,
  ): Promise<number> {
    const active = await this.getClient(options).refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      skip: maxSessions,
      select: { id: true },
    });

    if (active.length === 0) {
      return 0;
    }

    const result = await this.getClient(options).refreshToken.updateMany({
      where: { id: { in: active.map((session) => session.id) } },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    return result.count;
  }

  deleteExpired(now = new Date(), options?: RepositoryOptions): Promise<Prisma.BatchPayload> {
    return this.getClient(options).refreshToken.deleteMany({ where: { expiresAt: { lt: now } } });
  }
}
