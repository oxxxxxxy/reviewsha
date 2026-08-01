import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { IRepository, RepositoryOptions } from './repository.interface';

export type PrismaRepositoryClient = PrismaService | Prisma.TransactionClient;

export interface BaseDelegate<TModel> {
  findUnique(args: { where: { id: string } }): Promise<TModel | null>;
  count(args?: unknown): Promise<number>;
  delete(args: { where: { id: string } }): Promise<TModel>;
}

/**
 * Shared repository primitives for entities with a string id.
 * Concrete repositories keep domain-specific queries close to their aggregate.
 */
export abstract class BaseRepository<TModel> implements IRepository<TModel> {
  protected constructor(protected readonly prisma: PrismaService) {}

  protected abstract getDelegate(client: PrismaRepositoryClient): BaseDelegate<TModel>;

  protected getClient(options?: RepositoryOptions): PrismaRepositoryClient {
    return options?.tx ?? this.prisma;
  }

  async findById(id: string, options?: RepositoryOptions): Promise<TModel | null> {
    return this.getDelegate(this.getClient(options)).findUnique({ where: { id } });
  }

  async exists(id: string, options?: RepositoryOptions): Promise<boolean> {
    const total = await this.getDelegate(this.getClient(options)).count({ where: { id } });
    return total > 0;
  }

  async count(options?: RepositoryOptions): Promise<number> {
    return this.getDelegate(this.getClient(options)).count();
  }

  async deleteById(id: string, options?: RepositoryOptions): Promise<TModel> {
    return this.getDelegate(this.getClient(options)).delete({ where: { id } });
  }

  transaction<TResult>(
    handler: (tx: Prisma.TransactionClient) => Promise<TResult>,
  ): Promise<TResult> {
    return this.prisma.$transaction(handler);
  }
}
