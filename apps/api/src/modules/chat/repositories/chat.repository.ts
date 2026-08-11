import { Inject, Injectable } from '@nestjs/common';
import { MessageRole, type ChatMessage, type ChatSession, type Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const sessionInclude = { _count: { select: { messages: true } } } as const;

@Injectable()
export class ChatRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  createSession(data: Prisma.ChatSessionCreateInput) {
    return this.prisma.chatSession.create({ data, include: sessionInclude });
  }

  findSession(id: string): Promise<(ChatSession & { _count: { messages: number } }) | null> {
    return this.prisma.chatSession.findUnique({ where: { id }, include: sessionInclude });
  }

  findSessions(projectId: string, userId: string, skip: number, take: number) {
    return this.prisma.chatSession.findMany({
      where: { projectId, userId },
      include: sessionInclude,
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    });
  }

  countSessions(projectId: string, userId: string): Promise<number> {
    return this.prisma.chatSession.count({ where: { projectId, userId } });
  }

  async findMessages(
    sessionId: string,
    skip: number,
    take: number,
    filters: { search?: string; before?: Date; after?: Date; sort?: 'asc' | 'desc' } = {},
  ) {
    const where: Prisma.ChatMessageWhereInput = {
      sessionId,
      role: { not: MessageRole.SYSTEM },
      ...(filters.search ? { content: { contains: filters.search, mode: 'insensitive' } } : {}),
      ...(filters.before || filters.after
        ? {
            createdAt: {
              ...(filters.before ? { lt: filters.before } : {}),
              ...(filters.after ? { gt: filters.after } : {}),
            },
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: filters.sort ?? 'asc' },
        skip,
        take,
      }),
      this.prisma.chatMessage.count({
        where,
      }),
    ]);
    return { data, total };
  }

  recentMessages(sessionId: string, take: number): Promise<ChatMessage[]> {
    return this.prisma.chatMessage
      .findMany({
        where: { sessionId, role: { not: MessageRole.SYSTEM } },
        orderBy: { createdAt: 'desc' },
        take,
      })
      .then((messages) => messages.reverse());
  }

  saveMessage(data: Prisma.ChatMessageCreateInput): Promise<ChatMessage> {
    return this.prisma.chatMessage.create({ data });
  }

  findUserMessageByIdempotencyKey(
    sessionId: string,
    userId: string,
    idempotencyKey: string,
  ): Promise<ChatMessage | null> {
    return this.prisma.chatMessage.findFirst({
      where: {
        sessionId,
        userId,
        idempotencyKey,
        role: MessageRole.USER,
      },
    });
  }

  findAssistantMessageByIdempotencyKey(
    sessionId: string,
    userId: string,
    idempotencyKey: string,
  ): Promise<ChatMessage | null> {
    return this.prisma.chatMessage.findFirst({
      where: {
        sessionId,
        idempotencyKey,
        role: MessageRole.ASSISTANT,
        session: { userId },
      },
    });
  }

  findResponse(requestId: string): Promise<ChatMessage | null> {
    return this.prisma.chatMessage.findUnique({ where: { requestId } });
  }

  touchSession(id: string): Promise<ChatSession> {
    return this.prisma.chatSession.update({ where: { id }, data: { updatedAt: new Date() } });
  }

  updateMemory(
    id: string,
    data: Pick<
      Prisma.ChatSessionUpdateInput,
      'memory' | 'summary' | 'activeTopic' | 'summaryThrough'
    >,
  ): Promise<ChatSession> {
    return this.prisma.chatSession.update({ where: { id }, data });
  }

  messagesForMemory(sessionId: string, take = 100): Promise<ChatMessage[]> {
    return this.prisma.chatMessage.findMany({
      where: { sessionId, role: { not: MessageRole.SYSTEM } },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  deleteSession(id: string): Promise<ChatSession> {
    return this.prisma.chatSession.delete({ where: { id } });
  }

  latestContext(projectId: string) {
    return this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        language: true,
        lastAnalysisAt: true,
        scans: {
          where: { status: 'COMPLETED', deletedAt: null },
          orderBy: { finishedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            finishedAt: true,
            // Chunks contain redacted source captured during the latest scan.
            // They are used by ChatContextService to answer file-level questions.
            analysisContext: { select: { metadata: true, cacheKey: true, chunks: true } },
            report: {
              select: {
                id: true,
                summary: true,
                score: true,
                createdAt: true,
                findings: {
                  orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }],
                  take: 100,
                  select: {
                    severity: true,
                    category: true,
                    title: true,
                    description: true,
                    filePath: true,
                    line: true,
                    recommendation: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}
