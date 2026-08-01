import { Injectable } from '@nestjs/common';
import type { ChatSession, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseRepository,
  type BaseDelegate,
  type PrismaRepositoryClient,
} from '../base/base.repository';
import type { RepositoryOptions } from '../base/repository.interface';
import type { FindManyOptions } from '../project/project.repository.interface';
import type { IChatSessionRepository } from './chat-session.repository.interface';

@Injectable()
export class ChatSessionRepository
  extends BaseRepository<ChatSession>
  implements IChatSessionRepository
{
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(client: PrismaRepositoryClient): BaseDelegate<ChatSession> {
    return client.chatSession as unknown as BaseDelegate<ChatSession>;
  }

  createSession(
    data: Prisma.ChatSessionCreateInput,
    options?: RepositoryOptions,
  ): Promise<ChatSession> {
    return this.getClient(options).chatSession.create({ data });
  }

  findSessions(projectId: string, options?: FindManyOptions): Promise<ChatSession[]> {
    return this.getClient(options).chatSession.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  deleteSession(id: string, options?: RepositoryOptions): Promise<ChatSession> {
    return this.deleteById(id, options);
  }
}
