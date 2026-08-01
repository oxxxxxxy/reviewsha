import { Injectable } from '@nestjs/common';
import type { Prisma, RefreshToken } from '@prisma/client';
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

  revoke(tokenHash: string, options?: RepositoryOptions): Promise<RefreshToken> {
    return this.getClient(options).refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  revokeAll(userId: string, options?: RepositoryOptions): Promise<Prisma.BatchPayload> {
    return this.getClient(options).refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  deleteExpired(now = new Date(), options?: RepositoryOptions): Promise<Prisma.BatchPayload> {
    return this.getClient(options).refreshToken.deleteMany({ where: { expiresAt: { lt: now } } });
  }
}
