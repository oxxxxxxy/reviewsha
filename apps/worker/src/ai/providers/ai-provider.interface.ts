import type { LLMRequest } from '../types/ai.types';

/** A provider asked the caller to back off before retrying. */
export class AIProviderRateLimitError extends Error {
  readonly retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.name = 'AIProviderRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export type AIResponse = {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type AIStreamChunk = {
  content?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  done?: boolean;
};

export interface AIProvider {
  generate(request: LLMRequest): Promise<AIResponse>;
  stream?(request: LLMRequest, signal?: AbortSignal): AsyncIterable<AIStreamChunk>;
}
