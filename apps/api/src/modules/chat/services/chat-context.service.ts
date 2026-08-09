import { Inject, Injectable, PreconditionFailedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { ChatContextSnapshot } from '../interfaces/chat.interfaces';
import { ChatRepository } from '../repositories/chat.repository';
import { ChatSecretFilterService } from './chat-secret-filter.service';
import { ChatContextCacheService } from './chat-context-cache.service';

@Injectable()
export class ChatContextService {
  constructor(
    @Inject(ChatRepository) private readonly repository: ChatRepository,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(ChatSecretFilterService) private readonly secrets: ChatSecretFilterService,
    @Inject(ChatContextCacheService) private readonly cache: ChatContextCacheService,
  ) {}

  async build(projectId: string, question = ''): Promise<ChatContextSnapshot> {
    const project = await this.repository.latestContext(projectId);
    if (!project) throw new PreconditionFailedException('Project not found');
    const scan = project.scans?.[0];
    if (!scan?.report) {
      throw new PreconditionFailedException('Project has no completed analysis');
    }
    const terms = question.toLowerCase().match(/[\p{L}\p{N}_.\/-]{3,}/gu) ?? [];
    const questionKey = createHash('sha256')
      .update(terms.sort().join('|'))
      .digest('hex')
      .slice(0, 16);
    const cacheKey = `${project.id}:${scan.id}:${scan.analysisContext?.cacheKey ?? scan.report.id}:${questionKey}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

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
    };
    const maxTokens = this.config.get<number>('chat.contextMaxTokens', 8000);
    const text = this.fit(this.secrets.redact(JSON.stringify(context)), maxTokens);
    const snapshot = {
      cacheKey: createHash('sha256').update(text).digest('hex'),
      text,
      tokens: Math.ceil(text.length / 4),
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
