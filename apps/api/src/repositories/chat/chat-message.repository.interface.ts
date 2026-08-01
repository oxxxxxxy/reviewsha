import type { ChatMessage, Prisma } from '@prisma/client';
import type { IRepository, RepositoryOptions } from '../base/repository.interface';
import type { FindManyOptions } from '../project/project.repository.interface';

export interface IChatMessageRepository extends IRepository<ChatMessage> {
  addMessage(
    data: Prisma.ChatMessageCreateInput,
    options?: RepositoryOptions,
  ): Promise<ChatMessage>;
  findMessages(sessionId: string, options?: FindManyOptions): Promise<ChatMessage[]>;
  deleteMessages(sessionId: string, options?: RepositoryOptions): Promise<Prisma.BatchPayload>;
}
