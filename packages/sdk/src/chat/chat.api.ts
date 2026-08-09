import type { ApiClient } from '../client/api-client.js';

export interface ChatSession {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: string;
  readonly messagesCount: number;
}
export interface ChatListResponse {
  readonly data: readonly ChatSession[];
  readonly meta: { page: number; limit: number; total: number };
}

export interface ChatMessage {
  readonly id: string;
  readonly role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  readonly content: string;
  readonly tokens: number;
  readonly createdAt: string;
}

export interface ChatMessageRequest {
  readonly message: string;
}

export type ChatMessageResponse = ChatMessage;

export class ChatAPI {
  constructor(private readonly client: ApiClient) {}

  create(projectId: string, title?: string): Promise<ChatSession> {
    return this.client.post<ChatSession, { title?: string }>(`/projects/${projectId}/chat`, {
      title,
    });
  }

  list(projectId: string): Promise<ChatListResponse> {
    return this.client.get<ChatListResponse>(`/projects/${projectId}/chat`);
  }
  getMessages(sessionId: string): Promise<{ data: readonly ChatMessage[] }> {
    return this.client.get<{ data: readonly ChatMessage[] }>(`/chat/${sessionId}/messages`);
  }

  sendMessage(sessionId: string, payload: ChatMessageRequest): Promise<ChatMessageResponse> {
    return this.client.post<ChatMessageResponse, ChatMessageRequest>(
      `/chat/${sessionId}/messages`,
      payload,
    );
  }

  stream(
    sessionId: string,
    payload: ChatMessageRequest,
    onEvent: (event: { event: string; data: unknown }) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    return this.client.stream(`/chat/${sessionId}/stream`, payload, onEvent, signal);
  }
}
