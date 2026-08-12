import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIProviderRateLimitError,
  type AIProvider,
  type AIResponse,
  type AIStreamChunk,
} from '../providers/ai-provider.interface';
import type { LLMRequest, AIReviewResult } from '../types/ai.types';
import { AIResponseValidator } from './ai-response.validator';

@Injectable()
export class AIService {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(
    private readonly provider: AIProvider,
    private readonly validator: AIResponseValidator,
    private readonly config?: ConfigService,
  ) {}

  async analyze(request: LLMRequest): Promise<{ response: AIResponse; result: AIReviewResult }> {
    const response = await this.generate(request);
    return { response, result: this.validateResponse(response) };
  }

  async generate(request: LLMRequest): Promise<AIResponse> {
    await this.acquire();
    try {
      const attempts = this.config?.get<number>('worker.aiRetryAttempts', 3) ?? 3;
      const initialDelay = this.config?.get<number>('worker.aiRetryDelayMs', 1000) ?? 1000;
      const maxDelay = this.config?.get<number>('worker.aiRetryMaxDelayMs', 120000) ?? 120000;
      let lastError: unknown;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          return await this.provider.generate(request);
        } catch (error) {
          lastError = error;
          if (!this.isRetryable(error) || attempt === attempts) throw error;
          await this.delay(this.retryDelay(error, initialDelay, maxDelay, attempt));
        }
      }
      throw lastError;
    } finally {
      this.release();
    }
  }

  async *stream(request: LLMRequest, signal?: AbortSignal): AsyncIterable<AIStreamChunk> {
    await this.acquire();
    try {
      const attempts = this.config?.get<number>('worker.aiRetryAttempts', 3) ?? 3;
      const initialDelay = this.config?.get<number>('worker.aiRetryDelayMs', 1000) ?? 1000;
      const maxDelay = this.config?.get<number>('worker.aiRetryMaxDelayMs', 120000) ?? 120000;
      let lastError: unknown;
      let emitted = false;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          if (this.provider.stream) {
            for await (const chunk of this.provider.stream(request, signal)) {
              if (chunk.content) emitted = true;
              yield chunk;
            }
          } else {
            const response = await this.provider.generate(request);
            yield response;
          }
          return;
        } catch (error) {
          lastError = error;
          if (signal?.aborted || emitted || !this.isRetryable(error) || attempt === attempts) {
            throw error;
          }
          await this.delay(this.retryDelay(error, initialDelay, maxDelay, attempt));
        }
      }
      throw lastError;
    } finally {
      this.release();
    }
  }

  validateResponse(response: AIResponse): AIReviewResult {
    return this.validator.parse(response.content);
  }

  private async acquire(): Promise<void> {
    const limit = this.config?.get<number>('worker.aiMaxConcurrency', 3) ?? 3;
    if (this.active < limit) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.active += 1;
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    this.waiting.shift()?.();
  }

  private isRetryable(error: unknown): boolean {
    const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
    return /abort|timeout|network|fetch|ECONN|rate[_ -]?limit|HTTP 429|HTTP 5\d\d/iu.test(message);
  }

  private retryDelay(
    error: unknown,
    initialDelay: number,
    maxDelay: number,
    attempt: number,
  ): number {
    const providerDelay =
      error instanceof AIProviderRateLimitError ? error.retryAfterMs : undefined;
    return Math.min(maxDelay, Math.max(providerDelay ?? 0, initialDelay * 2 ** (attempt - 1)));
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
