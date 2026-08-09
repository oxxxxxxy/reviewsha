import { Injectable } from '@nestjs/common';
import type { AIChunk, AITask, LLMRequest } from '../types/ai.types';

const templates: Record<Exclude<AITask, 'chat'>, string> = {
  architecture: 'Проведи review архитектуры, зависимостей и границ модулей.',
  bugs: 'Найди потенциальные ошибки, edge cases и некорректные состояния.',
  security: 'Проведи security review: auth, permissions, injection и утечки секретов.',
  quality: 'Оцени читаемость, поддерживаемость и качество кода.',
  performance: 'Найди узкие места производительности, N+1 и лишние операции.',
};

@Injectable()
export class PromptBuilderService {
  build(
    task: AITask,
    chunks: AIChunk[],
    project: Record<string, unknown> = {},
    maxTokens = 12_000,
  ): LLMRequest {
    if (task === 'chat') throw new Error('Chat prompts must use the dedicated chat processor');
    const overhead = Math.ceil((JSON.stringify(project).length + templates[task].length + 600) / 4);
    const selected: AIChunk[] = [];
    let tokens = overhead;
    for (const chunk of chunks) {
      if (tokens + chunk.tokens > maxTokens) continue;
      selected.push(chunk);
      tokens += chunk.tokens;
    }
    const code = selected.map((chunk) => `### ${chunk.path}\n${chunk.content}`).join('\n\n');
    return {
      task,
      chunks: selected,
      outputFormat: 'json',
      system: 'Ты опытный Senior Developer и Code Reviewer. Отвечай только валидным JSON.',
      prompt: `PROJECT CONTEXT\n${JSON.stringify(project)}\n\nTASK\n${templates[task]}\n\nCODE\n${code}\n\nOUTPUT FORMAT\n{"issues":[{"severity":"HIGH","category":"SECURITY","file":"path","line":1,"problem":"","recommendation":""}],"summary":"","strengths":[],"weaknesses":[]}`,
    };
  }
}
