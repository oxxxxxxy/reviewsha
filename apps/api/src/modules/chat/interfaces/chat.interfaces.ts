import type { MessageRole } from '@prisma/client';

export interface ChatContextSnapshot {
  cacheKey: string;
  text: string;
  tokens: number;
  files?: string[];
}

export interface ChatHistoryItem {
  role: MessageRole;
  content: string;
}

export interface ChatGeneratePayload {
  sessionId: string;
  projectId: string;
  userId: string;
  userMessageId: string;
  system: string;
  context: string;
  history: ChatHistoryItem[];
  message: string;
}
