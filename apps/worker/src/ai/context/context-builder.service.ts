import { Injectable } from '@nestjs/common';
import type { AIChunk, AITask } from '../types/ai.types';

@Injectable()
export class ContextBuilderService {
  select(chunks: AIChunk[], task: AITask, maxTokens = 8000): AIChunk[] {
    const preferred =
      task === 'security'
        ? ['security', 'auth', 'guard', 'controller']
        : task === 'architecture'
          ? ['module', 'architecture', 'config', 'repository']
          : [];
    const ranked = [...chunks].sort((a, b) => this.rank(b, preferred) - this.rank(a, preferred));
    const selected: AIChunk[] = [];
    let total = 0;
    for (const chunk of ranked) {
      if (total + chunk.tokens > maxTokens) continue;
      selected.push(chunk);
      total += chunk.tokens;
    }
    return selected;
  }
  private rank(chunk: AIChunk, preferred: string[]): number {
    return preferred.some((term) => chunk.path.toLowerCase().includes(term))
      ? 2
      : chunk.type === 'architecture'
        ? 1
        : 0;
  }
}
