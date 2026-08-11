import {
  BadRequestException,
  GatewayTimeoutException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
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
  private readonly repository: ChatRepository;
  private readonly sessions: ChatSessionService;
  private readonly contexts: ChatContextService;
  private readonly queues: QueueService;
  private readonly config: ConfigService;
  private readonly logger: ApiLoggerService;
  private readonly secrets: ChatSecretFilterService;
  private readonly memory: ChatMemoryService;

  /** Coalesces the complete response lifecycle for concurrent HTTP retries. */
  private readonly sendInFlight = new Map<
    string,
    Promise<{
      id: string;
      role: MessageRole;
      content: string;
      tokens: number;
      createdAt: Date;
    }>
  >();

  /**
   * Closes the in-process race between duplicate retries. BullMQ's stable job
   * id remains the durable deduplication boundary after a process restart.
   */
  private readonly enqueueInFlight = new Map<string, Promise<{ requestId: string }>>();

  constructor(
    @Inject(ChatRepository) repository: ChatRepository,
    @Inject(ChatSessionService) sessions: ChatSessionService,
    @Inject(ChatContextService) contexts: ChatContextService,
    @Inject(QueueService) queues: QueueService,
    @Inject(ConfigService) config: ConfigService,
    @Inject(ApiLoggerService) logger: ApiLoggerService,
    @Inject(ChatSecretFilterService) secrets: ChatSecretFilterService,
    @Inject(ChatMemoryService) memory: ChatMemoryService,
  ) {
    this.repository = repository;
    this.sessions = sessions;
    this.contexts = contexts;
    this.queues = queues;
    this.config = config;
    this.logger = logger;
    this.secrets = secrets;
    this.memory = memory;
  }

  async history(user: AuthenticatedUser, sessionId: string, query: ChatPaginationDto) {
    await this.sessions.requireOwned(user, sessionId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 50);
    const result = await this.repository.findMessages(sessionId, (page - 1) * limit, limit, {
      search: query.search?.trim() || undefined,
      before: query.before ? new Date(query.before) : undefined,
      after: query.after ? new Date(query.after) : undefined,
      sort: query.sort,
    });
    return {
      data: result.data.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        tokens: message.tokens,
        createdAt: message.createdAt,
      })),
      meta: { page, limit, total: result.total },
    };
  }

  async assertAvailable(user: AuthenticatedUser, sessionId: string): Promise<void> {
    const session = await this.sessions.requireOwned(user, sessionId);
    await this.contexts.assertAvailable(session.projectId);
  }

  async send(user: AuthenticatedUser, sessionId: string, dto: SendMessageDto) {
    const idempotencyKey = dto.idempotencyKey?.trim();
    const lockKey = idempotencyKey ? `${user.id}:${sessionId}:${idempotencyKey}` : undefined;
    if (lockKey) {
      const inFlight = this.sendInFlight.get(lockKey);
      if (inFlight) return inFlight;

      const promise = this.sendOnce(user, sessionId, dto);
      this.sendInFlight.set(lockKey, promise);
      try {
        return await promise;
      } finally {
        if (this.sendInFlight.get(lockKey) === promise) this.sendInFlight.delete(lockKey);
      }
    }

    return this.sendOnce(user, sessionId, dto);
  }

  private async sendOnce(user: AuthenticatedUser, sessionId: string, dto: SendMessageDto) {
    const message = dto.message.trim();
    const { requestId } = await this.enqueue(
      user,
      sessionId,
      message,
      undefined,
      dto.idempotencyKey,
      dto.language,
    );
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
    const { requestId } = await this.enqueue(
      user,
      sessionId,
      message,
      streamId,
      dto.idempotencyKey,
      dto.language,
    );
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
    idempotencyKey?: string,
    language?: 'en' | 'ru',
  ): Promise<{ requestId: string }> {
    const normalizedKey = idempotencyKey?.trim();
    const lockKey = normalizedKey ? `${user.id}:${sessionId}:${normalizedKey}` : undefined;
    if (lockKey) {
      const inFlight = this.enqueueInFlight.get(lockKey);
      if (inFlight) return inFlight;

      const promise = this.enqueueOnce(user, sessionId, message, streamId, normalizedKey, language);
      this.enqueueInFlight.set(lockKey, promise);
      try {
        return await promise;
      } finally {
        if (this.enqueueInFlight.get(lockKey) === promise) {
          this.enqueueInFlight.delete(lockKey);
        }
      }
    }

    return this.enqueueOnce(user, sessionId, message, streamId, normalizedKey, language);
  }

  private async enqueueOnce(
    user: AuthenticatedUser,
    sessionId: string,
    message: string,
    streamId?: string,
    idempotencyKey?: string,
    language?: 'en' | 'ru',
  ): Promise<{ requestId: string }> {
    const session = await this.sessions.requireOwned(user, sessionId);
    await this.contexts.assertAvailable(session.projectId);
    const maxLength = this.config.get<number>('chat.messageMaxLength', 4000);
    if (!message || message.length > maxLength) {
      throw new BadRequestException('Chat message length is invalid');
    }
    // BullMQ job ids are also persisted as ChatMessage.requestId (@db.Uuid),
    // therefore the deterministic id must be a valid UUID rather than an
    // arbitrary hash string.
    const deterministicJobId = idempotencyKey
      ? this.deterministicUuid(`${sessionId}:${idempotencyKey}`)
      : undefined;
    if (deterministicJobId) {
      const existingUserMessage = await this.repository.findUserMessageByIdempotencyKey(
        sessionId,
        user.id,
        idempotencyKey!,
      );
      const existingAssistantMessage = await this.repository.findAssistantMessageByIdempotencyKey(
        sessionId,
        user.id,
        idempotencyKey!,
      );
      if (existingAssistantMessage?.requestId) {
        return { requestId: existingAssistantMessage.requestId };
      }
      const existing = await this.queues.getJob(QUEUE_NAMES.chat, deterministicJobId);
      // Keep compatibility with a job that was created before the durable
      // message marker was written. The worker still owns the final response.
      if (existing && !existingUserMessage) return { requestId: deterministicJobId };
      if (existing && existingUserMessage) return { requestId: deterministicJobId };
      if (!existingUserMessage) {
        const userMessage = await this.repository.saveMessage({
          session: { connect: { id: sessionId } },
          user: { connect: { id: user.id } },
          role: MessageRole.USER,
          content: message,
          tokens: Math.ceil(message.length / 4),
          idempotencyKey,
        });
        return this.enqueueWithMessage(
          user,
          session,
          message,
          streamId,
          deterministicJobId,
          idempotencyKey,
          userMessage.id,
          language,
        );
      }
      return this.enqueueWithMessage(
        user,
        session,
        message,
        streamId,
        deterministicJobId,
        idempotencyKey,
        existingUserMessage.id,
        language,
      );
    }
    const userMessage = await this.repository.saveMessage({
      session: { connect: { id: sessionId } },
      user: { connect: { id: user.id } },
      role: MessageRole.USER,
      content: message,
      tokens: Math.ceil(message.length / 4),
    });
    return this.enqueueWithMessage(
      user,
      session,
      message,
      streamId,
      undefined,
      undefined,
      userMessage.id,
      language,
    );
  }

  private async enqueueWithMessage(
    user: AuthenticatedUser,
    session: {
      id: string;
      projectId: string;
      memory?: unknown;
      summary?: string | null;
      activeTopic?: string | null;
    },
    message: string,
    streamId: string | undefined,
    deterministicJobId: string | undefined,
    idempotencyKey: string | undefined,
    userMessageId: string,
    language?: 'en' | 'ru',
  ): Promise<{ requestId: string }> {
    const context = await this.contexts.build(session.projectId, message);
    const history = await this.repository.recentMessages(session.id, 20);
    const payload = {
      sessionId: session.id,
      projectId: session.projectId,
      userId: user.id,
      userMessageId,
      system: CHAT_SYSTEM_PROMPT,
      ...(language ? { system: `${CHAT_SYSTEM_PROMPT}\nRespond in ${language === 'ru' ? 'Russian' : 'English'} unless the user asks otherwise.` } : {}),
      context: context.text,
      history: history.map(({ role, content }) => ({
        role,
        content: this.secrets.redact(content),
      })),
      memory: session.memory ?? null,
      summary: session.summary ?? null,
      activeTopic: session.activeTopic ?? null,
      message: this.secrets.redact(message),
      ...(idempotencyKey ? { idempotencyKey } : {}),
      ...(streamId ? { streamId } : {}),
    };
    const queued = deterministicJobId
      ? await this.queues.addJob(QUEUE_NAMES.chat, 'chat.generate', payload, {
          jobId: deterministicJobId,
        })
      : await this.queues.addJob(QUEUE_NAMES.chat, 'chat.generate', payload);
    return { requestId: queued.id };
  }

  private deterministicUuid(value: string): string {
    const bytes = createHash('sha256').update(value).digest().subarray(0, 16);
    bytes[6] = (bytes[6]! & 0x0f) | 0x50;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
