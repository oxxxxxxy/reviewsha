import { ConflictException, Inject, Injectable, PreconditionFailedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { ChatContextSnapshot } from '../interfaces/chat.interfaces';
import { ChatRepository } from '../repositories/chat.repository';
import { ChatSecretFilterService } from './chat-secret-filter.service';
import { ChatContextCacheService } from './chat-context-cache.service';

@Injectable()
export class ChatContextService {
  private readonly repository: ChatRepository;
  private readonly config: ConfigService;
  private readonly secrets: ChatSecretFilterService;
  private readonly cache: ChatContextCacheService;

  constructor(
    @Inject(ChatRepository) repository: ChatRepository,
    @Inject(ConfigService) config: ConfigService,
    @Inject(ChatSecretFilterService) secrets: ChatSecretFilterService,
    @Inject(ChatContextCacheService) cache: ChatContextCacheService,
  ) {
    this.repository = repository;
    this.config = config;
    this.secrets = secrets;
    this.cache = cache;
  }

  /**
   * Chat must never enqueue a request for a project without a completed
   * report.  Keep this check before the user message is persisted: otherwise
   * a rejected request leaves a misleading message in the conversation.
   */
  async assertAvailable(projectId: string): Promise<void> {
    const project = await this.repository.latestContext(projectId);
    if (!project?.scans?.[0]?.report) {
      throw new ConflictException('Chat is unavailable until the project analysis is completed');
    }
  }

  async build(
    projectId: string,
    question = '',
    fileRefs: string[] = [],
  ): Promise<ChatContextSnapshot> {
    const project = await this.repository.latestContext(projectId);
    if (!project) throw new PreconditionFailedException('Project not found');
    const scan = project.scans?.[0];
    if (!scan?.report) {
      throw new PreconditionFailedException('Project has no completed analysis');
    }
    const terms: string[] = question.toLowerCase().match(/[\p{L}\p{N}_.\/-]{3,}/gu) ?? [];
    const questionKey = createHash('sha256')
      .update(`${terms.sort().join('|')}|files:${fileRefs.slice().sort().join('|')}`)
      .digest('hex')
      .slice(0, 16);
    const cacheKey = `${project.id}:${scan.id}:${scan.analysisContext?.cacheKey ?? scan.report.id}:${questionKey}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const rawChunks = Array.isArray(scan.analysisContext?.chunks)
      ? (scan.analysisContext.chunks as Array<{
          path?: string;
          content?: string;
          tokens?: number;
          filePaths?: string[];
        }>)
      : [];
    const requestedFiles = new Set(
      fileRefs.map((value) => value.replace(/^@/, '').trim()).filter(Boolean),
    );
    const relatedChunks = [...rawChunks]
      .map((chunk) => ({
        chunk,
        rank:
          (requestedFiles.has(chunk.path ?? '') ? 100 : 0) +
          (chunk.path ?? '')
            .toLowerCase()
            .split(/[^\p{L}\p{N}_.\/-]+/u)
            .reduce((score, part) => score + (terms.includes(part) ? 3 : 0), 0),
      }))
      .sort((left, right) => right.rank - left.rank)
      .map(({ chunk }) => chunk)
      .slice(0, 12);
    const fileContext = relatedChunks.map((chunk) => ({
      path: chunk.path,
      files: chunk.filePaths ?? [chunk.path],
      source: chunk.content,
    }));
    const context = {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        language: project.language,
      },
      analysis: {
        id: scan.id,
        completedAt: scan.finishedAt,
        metadata: scan.analysisContext?.metadata ?? {},
      },
      report: {
        id: scan.report.id,
        score: scan.report.score,
        summary: scan.report.summary,
      },
      issues: [...scan.report.findings].sort(
        (left, right) => this.relevance(right, terms) - this.relevance(left, terms),
      ),
      recommendations: [...scan.report.findings]
        .sort((left, right) => this.relevance(right, terms) - this.relevance(left, terms))
        .map((finding) => finding.recommendation)
        .filter((value): value is string => Boolean(value)),
      files: fileContext,
    };
    const maxTokens = this.config.get<number>('chat.contextMaxTokens', 8000);
    const text = this.fit(this.secrets.redact(JSON.stringify(context)), maxTokens);
    const snapshot = {
      cacheKey: createHash('sha256').update(text).digest('hex'),
      text,
      tokens: Math.ceil(text.length / 4),
      files: relatedChunks.flatMap((chunk) => chunk.filePaths ?? (chunk.path ? [chunk.path] : [])),
    };
    await this.cache.set(cacheKey, snapshot);
    return snapshot;
  }

  clear(projectId?: string): Promise<void> {
    return this.cache.clear(projectId);
  }

  private fit(value: string, maxTokens: number): string {
    const maxCharacters = maxTokens * 4;
    if (value.length <= maxCharacters) return value;
    const marker = '[context truncated]';
    if (maxCharacters <= marker.length) return marker.slice(0, maxCharacters);
    return `${value.slice(0, maxCharacters - marker.length)}${marker}`;
  }

  private relevance(finding: Record<string, unknown>, terms: string[]): number {
    const text = JSON.stringify(finding).toLowerCase();
    return terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
  }
}
