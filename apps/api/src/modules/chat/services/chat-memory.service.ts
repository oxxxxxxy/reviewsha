import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ChatRepository } from '../repositories/chat.repository';
import { ConversationSummaryService } from './conversation-summary.service';

export type ChatMemory = {
  files: string[];
  issues: string[];
  recommendations: string[];
  topic: string;
};

@Injectable()
export class ChatMemoryService {
  private readonly repository: ChatRepository;
  private readonly summaries: ConversationSummaryService;

  constructor(
    @Inject(ChatRepository) repository: ChatRepository,
    @Inject(ConversationSummaryService) summaries: ConversationSummaryService,
  ) {
    this.repository = repository;
    this.summaries = summaries;
  }

  async update(sessionId: string, question: string, answer: string): Promise<ChatMemory> {
    const session = await this.repository.findSession(sessionId);
    const messages = await this.repository.messagesForMemory(sessionId, 100);
    const combined = `${question}\n${answer}`;
    const previous = this.asMemory(session?.memory);
    const files = [
      ...new Set([...previous.files, ...(combined.match(/[\w./-]+\.[a-z0-9]{1,10}\b/giu) ?? [])]),
    ].slice(0, 30);
    const issues = [
      ...new Set([
        ...previous.issues,
        ...(combined.match(
          /(?:\b(?:critical|high|medium|low|bug|issue|vulnerability)\b|ошиб[\p{L}]*|уязвим[\p{L}]*)/giu,
        ) ?? []),
      ]),
    ].slice(0, 30);
    const recommendations = [
      ...new Set([
        ...previous.recommendations,
        ...answer
          .split(/\n|(?<=[.!?])\s+/u)
          .filter((line) => /recommend|should|fix|исправ|рекоменду/iu.test(line)),
      ]),
    ].slice(0, 20);
    const topic = question.replace(/\s+/gu, ' ').trim().slice(0, 255);
    const memory: ChatMemory = {
      files,
      issues,
      recommendations,
      topic: topic || previous.topic,
    };
    const older = messages.slice(20);
    await this.repository.updateMemory(sessionId, {
      memory: memory as unknown as Prisma.InputJsonValue,
      activeTopic: topic,
      summary: older.length ? this.summaries.summarize(older) : session?.summary,
      summaryThrough: older[0]?.createdAt,
    });
    return memory;
  }

  private asMemory(value: unknown): ChatMemory {
    if (!value || typeof value !== 'object') {
      return { files: [], issues: [], recommendations: [], topic: '' };
    }
    const record = value as Partial<ChatMemory>;
    return {
      files: Array.isArray(record.files)
        ? record.files.filter((item): item is string => typeof item === 'string')
        : [],
      issues: Array.isArray(record.issues)
        ? record.issues.filter((item): item is string => typeof item === 'string')
        : [],
      recommendations: Array.isArray(record.recommendations)
        ? record.recommendations.filter((item): item is string => typeof item === 'string')
        : [],
      topic: typeof record.topic === 'string' ? record.topic : '',
    };
  }
}
