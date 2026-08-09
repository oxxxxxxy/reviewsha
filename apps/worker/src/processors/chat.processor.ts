import { Injectable } from '@nestjs/common';
import { MessageRole } from '@prisma/client';
import type { Job } from 'bullmq';

import { AIService } from '../ai/services/ai.service';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { WorkerDatabaseService } from '../database/worker-database.service';
import type { QueueJobResult } from '../queue/queue.events';
import type { JobHandler } from './job-handler.interface';

type ChatHistoryItem = { role: MessageRole; content: string };
type ChatPayload = {
  sessionId: string;
  projectId: string;
  userId: string;
  userMessageId: string;
  system: string;
  context: string;
  history: ChatHistoryItem[];
  message: string;
};

@Injectable()
export class ChatProcessor implements JobHandler {
  readonly type = 'chat.generate';

  constructor(
    private readonly db: WorkerDatabaseService,
    private readonly ai: AIService,
    private readonly logger: WorkerLoggerService,
  ) {}

  async execute(job: Job): Promise<QueueJobResult> {
    const payload = this.payloadOf(job);
    const requestId = String(job.id);
    const session = await this.db.chatSession.findFirst({
      where: {
        id: payload.sessionId,
        projectId: payload.projectId,
        userId: payload.userId,
      },
      select: { id: true },
    });
    if (!session) throw new Error('CHAT_SESSION_NOT_FOUND');
    const userMessage = await this.db.chatMessage.findFirst({
      where: {
        id: payload.userMessageId,
        sessionId: payload.sessionId,
        userId: payload.userId,
        role: MessageRole.USER,
      },
      select: { id: true },
    });
    if (!userMessage) throw new Error('CHAT_USER_MESSAGE_NOT_FOUND');

    const startedAt = Date.now();
    const response = await this.ai.generate({
      system: payload.system,
      prompt: this.prompt(payload),
      outputFormat: 'text',
      chunks: [],
      task: 'chat',
    });
    const content = response.content.trim();
    if (!content) throw new Error('AI_EMPTY_CHAT_RESPONSE');

    const message = await this.db.chatMessage.upsert({
      where: { requestId },
      create: {
        sessionId: payload.sessionId,
        role: MessageRole.ASSISTANT,
        content,
        tokens: response.completionTokens,
        requestId,
      },
      update: {
        content,
        tokens: response.completionTokens,
      },
    });
    await this.db.chatUsage.upsert({
      where: { assistantMessageId: message.id },
      create: {
        sessionId: payload.sessionId,
        assistantMessageId: message.id,
        model: response.model,
        inputTokens: response.promptTokens,
        outputTokens: response.completionTokens,
        totalTokens: response.totalTokens,
        durationMs: Date.now() - startedAt,
      },
      update: {
        model: response.model,
        inputTokens: response.promptTokens,
        outputTokens: response.completionTokens,
        totalTokens: response.totalTokens,
        durationMs: Date.now() - startedAt,
      },
    });
    await this.db.chatSession.update({
      where: { id: payload.sessionId },
      data: { updatedAt: new Date() },
    });
    this.logger.log(
      `Chat response completed sessionId=${payload.sessionId} model=${response.model} tokens=${response.totalTokens} durationMs=${Date.now() - startedAt}`,
      'ChatProcessor',
    );
    return {
      status: 'completed',
      queue: job.queueName,
      jobId: requestId,
      data: { messageId: message.id, tokens: response.totalTokens },
    };
  }

  private payloadOf(job: Job): ChatPayload {
    const value =
      job.data && typeof job.data === 'object' && 'payload' in job.data
        ? job.data.payload
        : job.data;
    if (!value || typeof value !== 'object') throw new Error('CHAT_PAYLOAD_REQUIRED');
    const payload = value as Partial<ChatPayload>;
    const required = [
      payload.sessionId,
      payload.projectId,
      payload.userId,
      payload.userMessageId,
      payload.system,
      payload.context,
      payload.message,
    ];
    if (required.some((item) => typeof item !== 'string' || item.length === 0)) {
      throw new Error('CHAT_PAYLOAD_INVALID');
    }
    if (!Array.isArray(payload.history)) throw new Error('CHAT_HISTORY_INVALID');
    return payload as ChatPayload;
  }

  private prompt(payload: ChatPayload): string {
    const history = payload.history
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');
    return [
      'PROJECT CONTEXT',
      payload.context,
      'CONVERSATION HISTORY',
      history || '[no previous messages]',
      'CURRENT QUESTION',
      payload.message,
    ].join('\n\n');
  }
}
