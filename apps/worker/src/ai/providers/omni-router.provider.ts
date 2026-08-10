import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AIProvider, AIResponse, AIStreamChunk } from './ai-provider.interface';
import type { LLMRequest } from '../types/ai.types';

@Injectable()
export class OmniRouterProvider implements AIProvider {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}
  async generate(request: LLMRequest): Promise<AIResponse> {
    const apiKey = this.config.get<string>('worker.aiApiKey');
    if (!apiKey) throw new Error('OMNIROUTER_API_KEY is not configured');
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.get<number>('worker.aiTimeoutMs', 60000),
    );
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
      if (!response.ok) throw new Error(`AI provider HTTP ${response.status}`);
      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const usage = body.usage ?? {};
      return {
        content: body.choices?.[0]?.message?.content ?? '',
        model: this.config.getOrThrow<string>('worker.aiModel'),
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        totalTokens: usage.total_tokens ?? 0,
      };
    } finally {
      clearTimeout(timeout);
    }
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
          const data = block
            .split(/\r?\n/)
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim())
            .join('');
          if (!data) continue;
          if (data === '[DONE]') {
            done = true;
            break;
          }
          const parsed = JSON.parse(data) as {
            model?: string;
            choices?: Array<{ delta?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
          };
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
        if (result.done) done = true;
      }
      yield { model, ...usage, done: true };
    } finally {
      signal?.removeEventListener('abort', abort);
      clearTimeout(timeout);
    }
  }
}
