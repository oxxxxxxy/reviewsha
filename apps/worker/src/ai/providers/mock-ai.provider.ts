import { Injectable } from '@nestjs/common';
import type { LLMRequest } from '../types/ai.types';
import type { AIProvider, AIResponse, AIStreamChunk } from './ai-provider.interface';

@Injectable()
export class MockAIProvider implements AIProvider {
  async generate(request: LLMRequest): Promise<AIResponse> {
    const content =
      request.task === 'chat'
        ? 'Mock Reviewsha chat response based on the available project context.'
        : JSON.stringify({
            issues: [],
            summary: `Mock ${request.task} review completed.`,
            strengths: [],
            weaknesses: [],
          });
    return {
      content,
      model: 'mock-reviewsha',
      promptTokens: Math.ceil((request.system.length + request.prompt.length) / 4),
      completionTokens: Math.ceil(content.length / 4),
      totalTokens: Math.ceil((request.system.length + request.prompt.length + content.length) / 4),
    };
  }

  async *stream(request: LLMRequest): AsyncIterable<AIStreamChunk> {
    const response = await this.generate(request);
    for (const token of response.content.match(/\S+\s*/gu) ?? []) {
      yield { content: token, model: response.model };
    }
    yield {
      model: response.model,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      totalTokens: response.totalTokens,
      done: true,
    };
  }
}
