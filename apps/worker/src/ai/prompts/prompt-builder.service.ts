import { Injectable } from '@nestjs/common';
import type { AIChunk, AITask, LLMRequest } from '../types/ai.types';

const templates: Record<AITask, string> = {
  architecture: 'Проведи review архитектуры, зависимостей и границ модулей.',
  bugs: 'Найди потенциальные ошибки, edge cases и некорректные состояния.',
  security: 'Проведи security review: auth, permissions, injection и утечки секретов.',
  quality: 'Оцени читаемость, поддерживаемость и качество кода.',
  performance: 'Найди узкие места производительности, N+1 и лишние операции.',
};

@Injectable()
export class PromptBuilderService {
  build(task: AITask, chunks: AIChunk[], project: Record<string, unknown> = {}): LLMRequest {
    const code = chunks.map((chunk) => `### ${chunk.path}\n${chunk.content}`).join('\n\n');
    return {
      task,
      chunks,
      outputFormat: 'json',
      system: 'Ты опытный Senior Developer и Code Reviewer. Отвечай только валидным JSON.',
      prompt: `PROJECT CONTEXT\n${JSON.stringify(project)}\n\nTASK\n${templates[task]}\n\nCODE\n${code}\n\nOUTPUT FORMAT\n{"issues":[{"severity":"HIGH","file":"path","line":1,"problem":"","recommendation":""}],"summary":"","strengths":[],"weaknesses":[]}`,
    };
  }
}
