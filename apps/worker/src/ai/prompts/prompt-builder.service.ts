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
const englishTemplates: Record<Exclude<AITask, 'chat'>, string> = {
  architecture:
    'Perform a complete review of architecture, dependencies, module boundaries, API contracts and cohesion.',
  bugs: 'Find potential bugs, edge cases, race conditions, invalid states and unhandled exceptions.',
  security:
    'Perform a complete security review: auth, permissions, injection, SSRF, XSS, secret leaks and unsafe configuration.',
  quality:
    'Assess readability, testability, maintainability, duplication, documentation and the quality of every file.',
  performance:
    'Find performance bottlenecks, N+1 queries, unnecessary work, resource leaks and scalability problems.',
};

@Injectable()
export class PromptBuilderService {
  buildProjectReview(
    chunks: AIChunk[],
    project: Record<string, unknown> = {},
    maxTokens = 12_000,
    language: 'en' | 'ru' = 'ru',
  ): LLMRequest {
    const request = this.build('architecture', chunks, project, maxTokens, language);
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
    language: 'en' | 'ru' = 'ru',
  ): LLMRequest {
    const request = this.build('quality', chunks, project, maxTokens, language);
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
    language: 'en' | 'ru' = 'ru',
  ): LLMRequest {
    if (task === 'chat') throw new Error('Chat prompts must use the dedicated chat processor');
    const languageTemplate = language === 'en' ? englishTemplates[task] : templates[task];
    const overhead = Math.ceil(
      (JSON.stringify(project).length + languageTemplate.length + 600) / 4,
    );
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
        language === 'en'
          ? 'You are a senior developer and code reviewer. Return valid JSON only. Review every supplied file, do not invent issues, and write all prose fields in English.'
          : 'Ты опытный Senior Developer и Code Reviewer. Отвечай только валидным JSON. Проверяй каждый переданный файл, не выдумывай проблемы и пиши все текстовые поля на русском языке.',
      prompt: `PROJECT CONTEXT\n${JSON.stringify(project)}\n\nTASK\n${languageTemplate}\n\nCODE (review every file and cite exact paths/lines)\n${code}\n\nREVIEW RULES\n- Cite the exact file path and smallest accurate line or range; never guess.\n- Explain the issue using supplied code.\n- When a safe deterministic change is possible, include suggestedPatch with exact before and complete after text; preserve indentation. Omit it when uncertain.\n\nOUTPUT FORMAT\n{"issues":[{"severity":"HIGH","category":"SECURITY","file":"path","line":1,"problem":"${language === 'en' ? 'specific problem and why it matters' : 'конкретная проблема и почему она важна'}","recommendation":"${language === 'en' ? 'concrete fix' : 'конкретное исправление'}","suggestedPatch":{"before":"exact original code","after":"complete replacement code","startLine":1,"endLine":1}}],"summary":"${language === 'en' ? 'detailed conclusion' : 'развёрнутый вывод'}", "strengths":["${language === 'en' ? 'what is done well' : 'что сделано хорошо'}"],"weaknesses":["${language === 'en' ? 'systemic risk' : 'системный риск'}"]}`,
    };
  }
}
