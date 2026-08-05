import type { LLMRequest } from '../types/ai.types';
export type AIResponse = {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};
export interface AIProvider {
  generate(request: LLMRequest): Promise<AIResponse>;
}
