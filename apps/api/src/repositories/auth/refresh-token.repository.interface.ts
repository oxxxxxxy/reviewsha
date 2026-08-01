import type { Prisma, RefreshToken } from '@prisma/client';
import type { IRepository, RepositoryOptions } from '../base/repository.interface';

export interface IRefreshTokenRepository extends IRepository<RefreshToken> {
  create(data: Prisma.RefreshTokenCreateInput, options?: RepositoryOptions): Promise<RefreshToken>;
  findByHash(tokenHash: string, options?: RepositoryOptions): Promise<RefreshToken | null>;
  revoke(tokenHash: string, options?: RepositoryOptions): Promise<RefreshToken>;
  revokeAll(userId: string, options?: RepositoryOptions): Promise<Prisma.BatchPayload>;
  deleteExpired(now?: Date, options?: RepositoryOptions): Promise<Prisma.BatchPayload>;
}
