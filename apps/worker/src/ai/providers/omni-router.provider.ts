import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AIProvider, AIResponse, AIStreamChunk } from './ai-provider.interface';
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
    // OmniRoute exposes chat completions as SSE even when `stream` is not
    // requested. Reuse the streaming parser for normal analysis requests.
    let content = '';
    let model = (await this.runtimeSettings.get()).model;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    for await (const chunk of this.stream(request)) {
      content += chunk.content ?? '';
      model = chunk.model ?? model;
      promptTokens = chunk.promptTokens ?? promptTokens;
      completionTokens = chunk.completionTokens ?? completionTokens;
      totalTokens = chunk.totalTokens ?? totalTokens;
    }
    return { content, model, promptTokens, completionTokens, totalTokens };
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
      const response = await fetch(`${settings.baseUrl.replace(/\/+$/u, '')}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: settings.model,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          stream: true,
          stream_options: { include_usage: true },
          // Reasoning-capable OmniRoute models can spend the whole output
          // budget in hidden reasoning and return no structured content.
          // Keep reasoning bounded so the JSON review has room to complete.
          reasoning_effort: 'low',
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.prompt },
          ],
          ...(request.outputFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      if (!response.ok) {
        const body =
          typeof response.text === 'function' ? await response.text().catch(() => '') : '';
        throw new Error(
          `AI provider HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ''}`,
        );
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
              throw new Error(
                `OmniRoute ${parsed.error.code ?? 'error'}: ${parsed.error.message ?? 'provider request failed'}`,
              );
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
}
