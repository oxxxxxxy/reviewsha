import { Injectable } from '@nestjs/common';
import type { AIProvider, AIResponse } from '../providers/ai-provider.interface';
import type { LLMRequest, AIReviewResult } from '../types/ai.types';
import { AIResponseValidator } from './ai-response.validator';

@Injectable()
export class AIService {
  constructor(
    private readonly provider: AIProvider,
    private readonly validator: AIResponseValidator,
  ) {}
  async analyze(request: LLMRequest): Promise<{ response: AIResponse; result: AIReviewResult }> {
    const response = await this.provider.generate(request);
    return { response, result: this.validator.parse(response.content) };
  }
}
