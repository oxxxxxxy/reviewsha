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
  buildFileSelection(
    files: Array<{ path: string; preview?: string }> | string[],
    maxFiles = 3,
    language: 'en' | 'ru' = 'ru',
  ): LLMRequest {
    const english = language === 'en';
    const fileIndex = files
      .map((file) =>
        typeof file === 'string'
          ? `${file}\n  ${english ? 'preview unavailable' : 'превью недоступно'}`
          : `${file.path}\n  ${file.preview?.slice(0, 100) || (english ? 'preview unavailable' : 'превью недоступно')}`,
      )
      .join('\n');
    return {
      task: 'architecture',
      chunks: [],
      outputFormat: 'json',
      system: english
        ? 'You are a senior code-review architect. Return valid JSON only.'
        : 'Ты архитектор ревью кода. Отвечай только валидным JSON.',
      prompt: `${english ? 'PROJECT FILE TREE AND FIRST 100 CHARACTERS' : 'ДЕРЕВО ФАЙЛОВ ПРОЕКТА И ПЕРВЫЕ 100 СИМВОЛОВ'}\n${fileIndex}\n\n${
        english
          ? `Select up to ${maxFiles} most important source files for a high-signal first review. Prefer entrypoints, business logic, auth, data access and configuration. Return only {"files":["exact/path"]}.`
          : `Выбери до ${maxFiles} самых важных исходных файлов для первого содержательного ревью. Приоритет: точки входа, бизнес-логика, auth, доступ к данным и конфигурация. Верни только {"files":["точный/путь"]}.`
      }`,
    };
  }

  buildMergedProjectReview(
    chunks: AIChunk[],
    project: Record<string, unknown> = {},
    maxTokens = 2_500,
    language: 'en' | 'ru' = 'ru',
  ): LLMRequest {
    // Keep the source chunks ahead of the architecture metadata. The generic
    // builder is intentionally token-bounded and would otherwise spend the
    // whole budget on the project://architecture chunk, leaving the model
    // with no actual source code to review.
    const architecture = chunks.find((chunk) => chunk.type === 'architecture');
    const sourceChunks = chunks.filter((chunk) => chunk.type !== 'architecture');
    const request = this.build('architecture', sourceChunks, project, maxTokens, language);
    const tree = architecture?.content
      ? `\n\nPROJECT TREE AND METADATA\n${architecture.content}`
      : '';
    return {
      ...request,
      prompt: `${request.prompt}${tree}\n\nMERGED HIGH-SIGNAL REVIEW\nThe supplied source files were selected from the project tree. Their complete supplied contents are the primary review input. Review each supplied file separately inside one JSON response, but do not invent findings for files that were not supplied. Include the exact file path and line for every issue.`,
    };
  }

  buildProjectReview(
    chunks: AIChunk[],
    project: Record<string, unknown> = {},
    maxTokens = 2_500,
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
    maxTokens = 2_500,
    language: 'en' | 'ru' = 'ru',
  ): LLMRequest {
    const focused = chunks.filter(
      (chunk) => chunk.type !== 'architecture' && chunk.filePaths.includes(filePath),
    );
    const request = this.build('quality', focused, project, maxTokens, language);
    return {
      ...request,
      prompt: `${request.prompt}\n\nFOCUS FILE\n${filePath}\nReview this file in depth against the complete supplied project context. Return exact issues for this file and a detailed prose summary of the file, including its purpose, strengths, risks, dependencies and recommendations.`,
    };
  }
  build(
    task: AITask,
    chunks: AIChunk[],
    project: Record<string, unknown> = {},
    maxTokens = 2_500,
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
      prompt: `PROJECT CONTEXT\n${JSON.stringify(project)}\n\nTASK\n${languageTemplate}\n\nCODE (review every supplied file and cite exact paths/lines)\n${code}\n\nSTRICT LOCATION RULES\n- Every issue must refer to exactly one supplied file.\n- file must be the exact path after the FILE marker, never a prompt field, metadata field, project tree entry or another file.\n- Count source lines from the numbered file content, starting at 1.\n- Use lineStart and lineEnd for the complete problematic range. For one line they are equal.\n- suggestedPatch.before must be the exact text of lines lineStart..lineEnd from that same file. suggestedPatch.after is the complete replacement text.\n- Never copy JSON metadata, file lists, categories or prompt instructions into code fields.\n\nOUTPUT FORMAT\n{"issues":[{"severity":"HIGH","category":"SECURITY","file":"exact/path","line":1,"lineStart":1,"lineEnd":1,"problem":"${language === 'en' ? 'specific problem and why it matters' : 'конкретная проблема и почему она важна'}","recommendation":"${language === 'en' ? 'concrete fix' : 'конкретное исправление'}","suggestedPatch":{"before":"exact original lines from exact/path","after":"complete replacement text","startLine":1,"endLine":1}}],"summary":"${language === 'en' ? 'detailed conclusion' : 'развёрнутый вывод'}", "strengths":["${language === 'en' ? 'what is done well' : 'что сделано хорошо'}"],"weaknesses":["${language === 'en' ? 'systemic risk' : 'системный риск'}"]}`,
    };
  }
}
