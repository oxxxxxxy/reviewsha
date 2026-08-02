import type { Prisma, RefreshToken, RefreshTokenRevokedReason } from '@prisma/client';
import type { IRepository, RepositoryOptions } from '../base/repository.interface';

export interface IRefreshTokenRepository extends IRepository<RefreshToken> {
  create(data: Prisma.RefreshTokenCreateInput, options?: RepositoryOptions): Promise<RefreshToken>;
  findByHash(tokenHash: string, options?: RepositoryOptions): Promise<RefreshToken | null>;
  findByJti(jti: string, options?: RepositoryOptions): Promise<RefreshToken | null>;
  findActiveByUserId(userId: string, options?: RepositoryOptions): Promise<RefreshToken[]>;
  revoke(
    tokenHash: string,
    reason?: RefreshTokenRevokedReason,
    options?: RepositoryOptions,
  ): Promise<RefreshToken>;
  revokeById(
    id: string,
    reason?: RefreshTokenRevokedReason,
    options?: RepositoryOptions,
  ): Promise<RefreshToken>;
  revokeAll(
    userId: string,
    reason?: RefreshTokenRevokedReason,
    options?: RepositoryOptions,
  ): Promise<Prisma.BatchPayload>;
  updateActivity(
    id: string,
    data: Pick<Prisma.RefreshTokenUpdateInput, 'lastUsedAt' | 'lastIp' | 'lastUserAgent'>,
    options?: RepositoryOptions,
  ): Promise<RefreshToken>;
  enforceSessionLimit(
    userId: string,
    maxSessions: number,
    reason?: RefreshTokenRevokedReason,
    options?: RepositoryOptions,
  ): Promise<number>;
  deleteExpired(now?: Date, options?: RepositoryOptions): Promise<Prisma.BatchPayload>;
}
