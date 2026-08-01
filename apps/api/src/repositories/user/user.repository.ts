import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseRepository,
  type BaseDelegate,
  type PrismaRepositoryClient,
} from '../base/base.repository';
import type { RepositoryOptions } from '../base/repository.interface';
import type { IUserRepository } from './user.repository.interface';

@Injectable()
export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(client: PrismaRepositoryClient): BaseDelegate<User> {
    return client.user as unknown as BaseDelegate<User>;
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
    return this.deleteById(id, options);
  }
}
