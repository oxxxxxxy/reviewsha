import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import { ApiLoggerService } from '../../../common/logger/api-logger.service';
import { ProjectRepository } from '../../../repositories/project/project.repository';
import { CHAT_DEFAULT_TITLE } from '../constants/chat.constants';
import type { CreateChatDto } from '../dto/create-chat.dto';
import type { ChatPaginationDto } from '../dto/chat-query.dto';
import { ChatRepository } from '../repositories/chat.repository';

@Injectable()
export class ChatSessionService {
  constructor(
    @Inject(ChatRepository) private readonly repository: ChatRepository,
    @Inject(ProjectRepository) private readonly projects: ProjectRepository,
    @Inject(ApiLoggerService) private readonly logger: ApiLoggerService,
  ) {}

  async create(user: AuthenticatedUser, projectId: string, dto: CreateChatDto) {
    await this.assertProjectAccess(user, projectId);
    const session = await this.repository.createSession({
      project: { connect: { id: projectId } },
      user: { connect: { id: user.id } },
      title: dto.title?.trim() || CHAT_DEFAULT_TITLE,
    });
    this.logger.log(
      `Chat session created sessionId=${session.id} projectId=${projectId} userId=${user.id}`,
      'ChatSessionService',
    );
    return this.toResponse(session);
  }

  async list(user: AuthenticatedUser, projectId: string, query: ChatPaginationDto) {
    await this.assertProjectAccess(user, projectId);
    const [sessions, total] = await Promise.all([
      this.repository.findSessions(projectId, user.id, (query.page - 1) * query.limit, query.limit),
      this.repository.countSessions(projectId, user.id),
    ]);
    return {
      data: sessions.map((session) => this.toResponse(session)),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  async remove(user: AuthenticatedUser, sessionId: string): Promise<void> {
    const session = await this.requireOwned(user, sessionId);
    await this.repository.deleteSession(session.id);
    this.logger.log(
      `Chat session deleted sessionId=${sessionId} userId=${user.id}`,
      'ChatSessionService',
    );
  }

  async requireOwned(user: AuthenticatedUser, sessionId: string) {
    const session = await this.repository.findSession(sessionId);
    if (!session) throw new NotFoundException('Chat session not found');
    const admin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    if (!admin && session.userId !== user.id) {
      throw new ForbiddenException('You cannot access this chat session');
    }
    return session;
  }

  private async assertProjectAccess(user: AuthenticatedUser, projectId: string): Promise<void> {
    const admin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    const project = await this.projects.findByIdForOwnerIncludingDeleted(
      projectId,
      admin ? undefined : user.id,
    );
    if (!project || project.deletedAt) throw new NotFoundException('Project not found');
  }

  private toResponse(session: {
    id: string;
    title: string;
    updatedAt: Date;
    _count: { messages: number };
  }) {
    return {
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt,
      messagesCount: session._count.messages,
    };
  }
}
