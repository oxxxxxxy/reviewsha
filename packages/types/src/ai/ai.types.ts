export enum AIProvider {
  DeepSeek = 'deepseek',
  OpenAI = 'openai',
  Local = 'local',
  Mock = 'mock',
}

export interface AIUsage {
  provider: AIProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}
