import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIProviderRateLimitError,
  type AIProvider,
  type AIResponse,
  type AIStreamChunk,
} from './ai-provider.interface';
import type { LLMRequest } from '../types/ai.types';
import { AIRuntimeSettingsService } from '../services/ai-runtime-settings.service';

@Injectable()
export class OmniRouterProvider implements AIProvider {
  constructor(
    @Inject(AIRuntimeSettingsService)
    runtimeSettings: AIRuntimeSettingsService | ConfigService,
  ) {
    const legacyConfig = runtimeSettings as unknown as ConfigService;
    this.runtimeSettings =
      runtimeSettings instanceof ConfigService || typeof legacyConfig.getOrThrow === 'function'
        ? this.fromLegacyConfig(legacyConfig)
        : runtimeSettings;
  }

  private readonly runtimeSettings: AIRuntimeSettingsService;

  async generate(request: LLMRequest): Promise<AIResponse> {
    // Analysis and file selection use JSON completions. The DeepSeek Web
    // bridge can close an SSE response before emitting content for a larger
    // prompt, while the same request succeeds as a regular completion.
    const settings = await this.runtimeSettings.get();
    if (!settings.apiKey) throw new Error('OMNIROUTER_API_KEY is not configured');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), settings.timeoutMs);
    try {
      const response = await this.request(request, settings, false, controller.signal);
      if (!response.ok) throw await this.providerError(response);
      const json = (await response.json()) as {
        model?: string;
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const content = json.choices?.[0]?.message?.content?.trim() ?? '';
      if (!content) throw new Error('AI provider returned empty content');
      return {
        content,
        model: json.model ?? settings.model,
        promptTokens: json.usage?.prompt_tokens ?? 0,
        completionTokens: json.usage?.completion_tokens ?? 0,
        totalTokens: json.usage?.total_tokens ?? 0,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private fromLegacyConfig(config: ConfigService): AIRuntimeSettingsService {
    return {
      get: async () => ({
        provider: config.get<string>('worker.aiProvider', 'deepseek'),
        baseUrl: config.get<string>('worker.aiBaseUrl', 'https://openrouter.ai/api/v1'),
        model: config.get<string>('worker.aiModel', 'auto/best-coding'),
        apiKey: config.get<string>('worker.aiApiKey'),
        maxTokens: config.get<number>('worker.aiMaxTokens', 6000),
        temperature: config.get<number>('worker.aiTemperature', 0.2),
        timeoutMs: config.get<number>('worker.aiTimeoutMs', 60000),
        retryAttempts: config.get<number>('worker.aiRetryAttempts', 3),
        maxConcurrency: config.get<number>('worker.aiMaxConcurrency', 3),
        mergeFiles: config.get<boolean>('worker.aiMergeFiles', true),
        maxAnalysisFiles: config.get<number>('worker.aiMaxAnalysisFiles', 3),
      }),
    } as AIRuntimeSettingsService;
  }

  async *stream(request: LLMRequest, signal?: AbortSignal): AsyncIterable<AIStreamChunk> {
    const settings = await this.runtimeSettings.get();
    const apiKey = settings.apiKey;
    if (!apiKey) throw new Error('OMNIROUTER_API_KEY is not configured');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), settings.timeoutMs);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    try {
      const response = await this.request(request, settings, true, controller.signal);
      if (!response.ok) {
        throw await this.providerError(response);
      }
      if (!response.body) {
        if (typeof response.json === 'function') {
          const json = (await response.json()) as {
            model?: string;
            choices?: Array<{ message?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
          };
          yield {
            content: json.choices?.[0]?.message?.content ?? '',
            model: json.model ?? settings.model,
            promptTokens: json.usage?.prompt_tokens ?? 0,
            completionTokens: json.usage?.completion_tokens ?? 0,
            totalTokens: json.usage?.total_tokens ?? 0,
            done: true,
          };
          return;
        }
        throw new Error('AI provider returned an empty stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let model = settings.model;
      let usage: AIStreamChunk = {};
      let done = false;
      while (!done) {
        const result = await reader.read();
        buffer += decoder.decode(result.value ?? new Uint8Array(), { stream: !result.done });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() ?? '';
        for (const block of blocks) {
          // OmniRoute emits one JSON payload per SSE `data:` line. Parse
          // lines independently so a provider/proxy adding an extra `data:`
          // prefix cannot turn a valid payload into invalid JSON.
          for (const line of block.split(/\r?\n/)) {
            if (!line.startsWith('data:')) continue;
            let data = line.slice(5).trim();
            while (data.startsWith('data:')) data = data.slice(5).trim();
            if (!data) continue;
            if (data === '[DONE]') {
              done = true;
              break;
            }
            let parsed: {
              model?: string;
              choices?: Array<{ delta?: { content?: string } }>;
              usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
              error?: { message?: string; type?: string; code?: string };
            };
            try {
              parsed = JSON.parse(data) as typeof parsed;
            } catch {
              // Ignore non-JSON SSE comments/keep-alives and continue with
              // the next event instead of failing the whole analysis.
              continue;
            }
            if (parsed.error) {
              const message = `OmniRoute ${parsed.error.code ?? 'error'}: ${parsed.error.message ?? 'provider request failed'}`;
              if (
                parsed.error.code === 'rate_limit_exceeded' ||
                parsed.error.type === 'rate_limit_error'
              ) {
                throw new AIProviderRateLimitError(message);
              }
              throw new Error(message);
            }
            if (parsed.model) model = parsed.model;
            if (parsed.usage) {
              usage = {
                promptTokens: parsed.usage.prompt_tokens ?? 0,
                completionTokens: parsed.usage.completion_tokens ?? 0,
                totalTokens: parsed.usage.total_tokens ?? 0,
              };
            }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield { content, model };
          }
        }
        if (result.done) done = true;
      }
      yield { model, ...usage, done: true };
    } finally {
      signal?.removeEventListener('abort', abort);
      clearTimeout(timeout);
    }
  }

  private async request(
    request: LLMRequest,
    settings: {
      baseUrl: string;
      apiKey?: string;
      model: string;
      temperature: number;
      maxTokens: number;
    },
    stream: boolean,
    signal?: AbortSignal,
  ): Promise<Response> {
    return fetch(`${settings.baseUrl.replace(/\/+$/u, '')}/chat/completions`, {
      method: 'POST',
      signal,
      headers: { authorization: `Bearer ${settings.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: settings.model,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        stream,
        ...(stream ? { stream_options: { include_usage: true } } : {}),
        reasoning_effort: 'low',
        // The local llama.cpp MiniCPM endpoint otherwise spends the entire
        // completion budget in `reasoning_content` and leaves message.content
        // empty.  Disable thinking for this development model so the JSON
        // review contract is returned in the normal content field.
        ...(settings.baseUrl.includes('192.168.0.104:8080')
          ? { chat_template_kwargs: { enable_thinking: false } }
          : {}),
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.prompt },
        ],
        ...(request.outputFormat === 'json' && !settings.model.startsWith('ds-web/')
          ? { response_format: { type: 'json_object' } }
          : {}),
      }),
    });
  }

  private async providerError(response: Response): Promise<Error> {
    const body = typeof response.text === 'function' ? await response.text().catch(() => '') : '';
    const message = `AI provider HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ''}`;
    if (response.status === 429) {
      return new AIProviderRateLimitError(message, this.retryAfterMs(response, body));
    }
    return new Error(message);
  }

  private retryAfterMs(response: Response, body: string): number | undefined {
    const header = response.headers?.get?.('retry-after');
    if (header) {
      const seconds = Number(header);
      if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
      const date = Date.parse(header);
      if (Number.isFinite(date)) return Math.max(0, date - Date.now());
    }
    try {
      const parsed = JSON.parse(body) as {
        error?: { retry_after?: number; retryAfterMs?: number };
      };
      const value = parsed.error?.retryAfterMs ?? parsed.error?.retry_after;
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value < 1000 ? Math.max(0, value * 1000) : Math.max(0, value);
      }
    } catch {
      // The provider is allowed to return a non-JSON error body.
    }
    return undefined;
  }
}
