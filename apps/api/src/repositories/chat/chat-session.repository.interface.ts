import type { ChatSession, Prisma } from '@prisma/client';
import type { IRepository, RepositoryOptions } from '../base/repository.interface';
import type { FindManyOptions } from '../project/project.repository.interface';

export interface IChatSessionRepository extends IRepository<ChatSession> {
  createSession(
    data: Prisma.ChatSessionCreateInput,
    options?: RepositoryOptions,
  ): Promise<ChatSession>;
  findSessions(projectId: string, options?: FindManyOptions): Promise<ChatSession[]>;
  deleteSession(id: string, options?: RepositoryOptions): Promise<ChatSession>;
}
