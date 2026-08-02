import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseRepository,
  type BaseDelegate,
  type PrismaRepositoryClient,
} from '../base/base.repository';
import type { RepositoryOptions } from '../base/repository.interface';
import type {
  FindUsersParams,
  FindUsersResult,
  IUserRepository,
} from './user.repository.interface';

@Injectable()
export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(client: PrismaRepositoryClient): BaseDelegate<User> {
    return client.user as unknown as BaseDelegate<User>;
  }

  async findMany(params: FindUsersParams, options?: RepositoryOptions): Promise<FindUsersResult> {
    const skip = (params.page - 1) * params.limit;
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(params.search
        ? {
            OR: [
              { email: { contains: params.search, mode: 'insensitive' } },
              { displayName: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const client = this.getClient(options);
    const [items, total] = await Promise.all([
      client.user.findMany({
        where,
        orderBy: { [params.sort]: params.order },
        skip,
        take: params.limit,
      }),
      client.user.count({ where }),
    ]);

    return { items, total };
  }

  findByEmail(email: string, options?: RepositoryOptions): Promise<User | null> {
    return this.getClient(options).user.findUnique({ where: { email } });
  }

  create(data: Prisma.UserCreateInput, options?: RepositoryOptions): Promise<User> {
    return this.getClient(options).user.create({ data });
  }

  update(id: string, data: Prisma.UserUpdateInput, options?: RepositoryOptions): Promise<User> {
    return this.getClient(options).user.update({ where: { id }, data });
  }

  delete(id: string, options?: RepositoryOptions): Promise<User> {
    return this.getClient(options).user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
