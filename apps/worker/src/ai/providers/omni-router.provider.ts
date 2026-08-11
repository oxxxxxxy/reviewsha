import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AIProvider, AIResponse, AIStreamChunk } from './ai-provider.interface';
import type { LLMRequest } from '../types/ai.types';

@Injectable()
export class OmniRouterProvider implements AIProvider {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}
  async generate(request: LLMRequest): Promise<AIResponse> {
    // OmniRoute exposes chat completions as SSE even when `stream` is not
    // requested. Reuse the streaming parser for normal analysis requests.
    let content = '';
    let model = this.config.getOrThrow<string>('worker.aiModel');
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

  async *stream(request: LLMRequest, signal?: AbortSignal): AsyncIterable<AIStreamChunk> {
    const apiKey = this.config.get<string>('worker.aiApiKey');
    if (!apiKey) throw new Error('OMNIROUTER_API_KEY is not configured');
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.get<number>('worker.aiTimeoutMs', 60000),
    );
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    try {
      const response = await fetch(
        `${this.config.getOrThrow<string>('worker.aiBaseUrl')}/chat/completions`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            model: this.config.getOrThrow<string>('worker.aiModel'),
            temperature: this.config.get<number>('worker.aiTemperature', 0.2),
            max_tokens: this.config.get<number>('worker.aiMaxTokens', 4000),
            stream: true,
            stream_options: { include_usage: true },
            messages: [
              { role: 'system', content: request.system },
              { role: 'user', content: request.prompt },
            ],
            ...(request.outputFormat === 'json'
              ? { response_format: { type: 'json_object' } }
              : {}),
          }),
        },
      );
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `AI provider HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ''}`,
        );
      }
      if (!response.body) throw new Error('AI provider returned an empty stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let model = this.config.getOrThrow<string>('worker.aiModel');
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
            };
            try {
              parsed = JSON.parse(data) as typeof parsed;
            } catch {
              // Ignore non-JSON SSE comments/keep-alives and continue with
              // the next event instead of failing the whole analysis.
              continue;
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
