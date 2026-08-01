import type { Prisma, User } from '@prisma/client';
import type { IRepository, RepositoryOptions } from '../base/repository.interface';

export interface IUserRepository extends IRepository<User> {
  findByEmail(email: string, options?: RepositoryOptions): Promise<User | null>;
  create(data: Prisma.UserCreateInput, options?: RepositoryOptions): Promise<User>;
  update(id: string, data: Prisma.UserUpdateInput, options?: RepositoryOptions): Promise<User>;
  delete(id: string, options?: RepositoryOptions): Promise<User>;
}
