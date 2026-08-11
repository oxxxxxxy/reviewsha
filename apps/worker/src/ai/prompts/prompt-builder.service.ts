import { Injectable } from '@nestjs/common';
import type { AIChunk, AITask, LLMRequest } from '../types/ai.types';

const templates: Record<Exclude<AITask, 'chat'>, string> = {
  architecture:
    'Проведи полный review архитектуры, зависимостей, границ модулей, API-контрактов и связности.',
  bugs: 'Найди потенциальные ошибки, edge cases, race conditions, неверные состояния и необработанные исключения.',
  security:
    'Проведи полный security review: auth, permissions, injection, SSRF, XSS, утечки секретов и небезопасные настройки.',
  quality:
    'Оцени читаемость, тестируемость, поддерживаемость, дублирование, документацию и качество каждого файла.',
  performance:
    'Найди узкие места производительности, N+1, лишние операции, утечки ресурсов и проблемы масштабирования.',
};

@Injectable()
export class PromptBuilderService {
  buildProjectReview(
    chunks: AIChunk[],
    project: Record<string, unknown> = {},
    maxTokens = 12_000,
  ): LLMRequest {
    const request = this.build('architecture', chunks, project, maxTokens);
    return {
      ...request,
      prompt: `${request.prompt}\n\nPROJECT-WIDE REVIEW\nReview the complete supplied project as one system. Cover architecture, correctness, security, performance, maintainability, tests and documentation. Return a detailed project-level summary and only concrete, evidence-based issues.`,
    };
  }

  buildFileReview(
    filePath: string,
    chunks: AIChunk[],
    project: Record<string, unknown> = {},
    maxTokens = 12_000,
  ): LLMRequest {
    const request = this.build('quality', chunks, project, maxTokens);
    return {
      ...request,
      prompt: `${request.prompt}\n\nFOCUS FILE\n${filePath}\nReview this file in depth against the complete supplied project context. Return exact issues for this file and a detailed prose summary of the file, including its purpose, strengths, risks, dependencies and recommendations.`,
    };
  }
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
      system:
        'Ты опытный Senior Developer и Code Reviewer. Отвечай только валидным JSON. Проверяй каждый переданный файл, а не только очевидные проблемы. Не выдумывай проблемы: если файл действительно корректен, учитывай его в summary/strengths.',
      prompt: `PROJECT CONTEXT\n${JSON.stringify(project)}\n\nTASK\n${templates[task]}\n\nCODE (review every file and cite exact paths/lines)\n${code}\n\nOUTPUT FORMAT\n{"issues":[{"severity":"HIGH","category":"SECURITY","file":"path","line":1,"problem":" конкретная проблема и почему она важна ","recommendation":" конкретное исправление "}],"summary":"развёрнутый вывод по всему представленному проекту", "strengths":["что сделано хорошо"],"weaknesses":["системный риск"]}`,
    };
  }
}
