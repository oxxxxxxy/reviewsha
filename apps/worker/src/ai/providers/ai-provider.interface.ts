import type { LLMRequest } from '../types/ai.types';
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
