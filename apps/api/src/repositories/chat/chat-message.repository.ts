import { Inject, Injectable } from '@nestjs/common';
import type { ChatMessage, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseRepository,
  type BaseDelegate,
  type PrismaRepositoryClient,
} from '../base/base.repository';
import type { RepositoryOptions } from '../base/repository.interface';
import type { FindManyOptions } from '../project/project.repository.interface';
import type { IChatMessageRepository } from './chat-message.repository.interface';

@Injectable()
export class ChatMessageRepository
  extends BaseRepository<ChatMessage>
  implements IChatMessageRepository
{
  constructor(@Inject(PrismaService) prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(client: PrismaRepositoryClient): BaseDelegate<ChatMessage> {
    return client.chatMessage as unknown as BaseDelegate<ChatMessage>;
  }

  addMessage(
    data: Prisma.ChatMessageCreateInput,
    options?: RepositoryOptions,
  ): Promise<ChatMessage> {
    return this.getClient(options).chatMessage.create({ data });
  }

  findMessages(sessionId: string, options?: FindManyOptions): Promise<ChatMessage[]> {
    return this.getClient(options).chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  deleteMessages(sessionId: string, options?: RepositoryOptions): Promise<Prisma.BatchPayload> {
    return this.getClient(options).chatMessage.deleteMany({ where: { sessionId } });
  }
}
