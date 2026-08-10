import {
  BadRequestException,
  GatewayTimeoutException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageRole } from '@prisma/client';
import { ApiLoggerService } from '../../../common/logger/api-logger.service';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import { QUEUE_NAMES } from '../../queue/queue.constants';
import { QueueService } from '../../queue/queue.service';
import { CHAT_SYSTEM_PROMPT } from '../constants/chat.constants';
import type { ChatPaginationDto } from '../dto/chat-query.dto';
import type { SendMessageDto } from '../dto/send-message.dto';
import { ChatRepository } from '../repositories/chat.repository';
import { ChatContextService } from './chat-context.service';
import { ChatSessionService } from './chat-session.service';
import { ChatSecretFilterService } from './chat-secret-filter.service';
import { ChatMemoryService } from './chat-memory.service';

@Injectable()
export class ChatService {
  constructor(
    @Inject(ChatRepository) private readonly repository: ChatRepository,
    @Inject(ChatSessionService) private readonly sessions: ChatSessionService,
    @Inject(ChatContextService) private readonly contexts: ChatContextService,
    @Inject(QueueService) private readonly queues: QueueService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(ApiLoggerService) private readonly logger: ApiLoggerService,
    @Inject(ChatSecretFilterService) private readonly secrets: ChatSecretFilterService,
    @Inject(ChatMemoryService) private readonly memory: ChatMemoryService,
  ) {}

  async history(user: AuthenticatedUser, sessionId: string, query: ChatPaginationDto) {
    await this.sessions.requireOwned(user, sessionId);
    const result = await this.repository.findMessages(
      sessionId,
      (query.page - 1) * query.limit,
      query.limit,
      {
        search: query.search?.trim() || undefined,
        before: query.before ? new Date(query.before) : undefined,
        after: query.after ? new Date(query.after) : undefined,
        sort: query.sort,
      },
    );
    return {
      data: result.data.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        tokens: message.tokens,
        createdAt: message.createdAt,
      })),
      meta: { page: query.page, limit: query.limit, total: result.total },
    };
  }

  async send(user: AuthenticatedUser, sessionId: string, dto: SendMessageDto) {
    const message = dto.message.trim();
    const { requestId } = await this.enqueue(user, sessionId, message);
    this.logger.log(
      `Chat request started sessionId=${sessionId} jobId=${requestId}`,
      'ChatService',
    );
    const response = await this.waitForResponse(requestId);
    await this.repository.touchSession(sessionId);
    await this.memory.update(sessionId, message, response.content);
    this.logger.log(
      `Chat response received sessionId=${sessionId} tokens=${response.tokens}`,
      'ChatService',
    );
    return {
      id: response.id,
      role: response.role,
      content: response.content,
      tokens: response.tokens,
      createdAt: response.createdAt,
    };
  }

  async startStream(
    user: AuthenticatedUser,
    sessionId: string,
    dto: SendMessageDto,
    streamId: string,
  ) {
    const message = dto.message.trim();
    const { requestId } = await this.enqueue(user, sessionId, message, streamId);
    this.logger.log(
      `Chat streaming request started sessionId=${sessionId} jobId=${requestId} streamId=${streamId}`,
      'ChatService',
    );
    return { requestId };
  }

  async finishStream(
    user: AuthenticatedUser,
    sessionId: string,
    question: string,
    response: string,
  ): Promise<void> {
    await this.sessions.requireOwned(user, sessionId);
    await this.repository.touchSession(sessionId);
    await this.memory.update(sessionId, question, response);
  }

  private async enqueue(
    user: AuthenticatedUser,
    sessionId: string,
    message: string,
    streamId?: string,
  ): Promise<{ requestId: string }> {
    const session = await this.sessions.requireOwned(user, sessionId);
    const maxLength = this.config.get<number>('chat.messageMaxLength', 4000);
    if (!message || message.length > maxLength) {
      throw new BadRequestException('Chat message length is invalid');
    }
    const context = await this.contexts.build(session.projectId, message);
    const history = await this.repository.recentMessages(sessionId, 20);
    const userMessage = await this.repository.saveMessage({
      session: { connect: { id: sessionId } },
      user: { connect: { id: user.id } },
      role: MessageRole.USER,
      content: message,
      tokens: Math.ceil(message.length / 4),
    });
    const queued = await this.queues.addJob(QUEUE_NAMES.chat, 'chat.generate', {
      sessionId,
      projectId: session.projectId,
      userId: user.id,
      userMessageId: userMessage.id,
      system: CHAT_SYSTEM_PROMPT,
      context: context.text,
      history: history.map(({ role, content }) => ({
        role,
        content: this.secrets.redact(content),
      })),
      memory: session.memory ?? null,
      summary: session.summary ?? null,
      activeTopic: session.activeTopic ?? null,
      message: this.secrets.redact(message),
      ...(streamId ? { streamId } : {}),
    });
    return { requestId: queued.id };
  }

  private async waitForResponse(requestId: string) {
    const timeout = this.config.get<number>('chat.requestTimeoutMs', 60000);
    const interval = this.config.get<number>('chat.pollIntervalMs', 100);
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const response = await this.repository.findResponse(requestId);
      if (response) return response;
      const status = await this.queues.getJobStatus(QUEUE_NAMES.chat, requestId);
      if (status === 'failed') {
        this.logger.error(`Chat AI request failed jobId=${requestId}`, undefined, 'ChatService');
        throw new ServiceUnavailableException('AI provider is unavailable');
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    this.logger.error(`Chat AI request timed out jobId=${requestId}`, undefined, 'ChatService');
    throw new GatewayTimeoutException('AI response timed out');
  }
}
