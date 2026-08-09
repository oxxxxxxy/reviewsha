import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AIProvider, AIResponse } from '../providers/ai-provider.interface';
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
      let lastError: unknown;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          return await this.provider.generate(request);
        } catch (error) {
          lastError = error;
          if (!this.isRetryable(error) || attempt === attempts) throw error;
          await this.delay(initialDelay * 2 ** (attempt - 1));
        }
      }
      throw lastError;
    } finally {
      this.release();
    }
  }

  stream(request: LLMRequest): AsyncIterable<AIResponse> {
    const generate = async function* (service: AIService) {
      yield await service.generate(request);
    };
    return generate(this);
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
    return /abort|timeout|network|fetch|ECONN|HTTP 429|HTTP 5\d\d/iu.test(message);
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
