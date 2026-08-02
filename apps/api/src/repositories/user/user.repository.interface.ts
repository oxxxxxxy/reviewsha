import type { Prisma, User } from '@prisma/client';
import type { IRepository, RepositoryOptions } from '../base/repository.interface';

export interface FindUsersParams {
  readonly page: number;
  readonly limit: number;
  readonly search?: string;
  readonly sort: 'createdAt' | 'displayName' | 'email';
  readonly order: 'asc' | 'desc';
}

export interface FindUsersResult {
  readonly items: User[];
  readonly total: number;
}

export interface IUserRepository extends IRepository<User> {
  findMany(params: FindUsersParams, options?: RepositoryOptions): Promise<FindUsersResult>;
  findByEmail(email: string, options?: RepositoryOptions): Promise<User | null>;
  create(data: Prisma.UserCreateInput, options?: RepositoryOptions): Promise<User>;
  update(id: string, data: Prisma.UserUpdateInput, options?: RepositoryOptions): Promise<User>;
  delete(id: string, options?: RepositoryOptions): Promise<User>;
}
