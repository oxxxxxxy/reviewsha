import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AIProvider, AIResponse } from './ai-provider.interface';
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
}
