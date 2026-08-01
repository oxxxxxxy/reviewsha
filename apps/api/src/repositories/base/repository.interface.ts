import type { Prisma } from '@prisma/client';

export type TransactionClient = Prisma.TransactionClient;

export interface RepositoryOptions {
  readonly tx?: TransactionClient;
}

export interface IRepository<TModel> {
  findById(id: string, options?: RepositoryOptions): Promise<TModel | null>;
  exists(id: string, options?: RepositoryOptions): Promise<boolean>;
  count(options?: RepositoryOptions): Promise<number>;
  deleteById(id: string, options?: RepositoryOptions): Promise<TModel>;
}
