import type { ApiClient } from '../client/api-client.js';
import type { components } from '../generated/openapi.js';

export type ChatSession = components['schemas']['ChatSessionResponseDto'];
export type ChatListResponse = components['schemas']['ChatSessionListResponseDto'];
export type ChatMessage = components['schemas']['ChatMessageResponseDto'];
export type ChatMessageListResponse = components['schemas']['ChatMessageListResponseDto'];
export type CreateChatRequest = components['schemas']['CreateChatDto'];

export type ChatMessageRequest = components['schemas']['SendMessageDto'];
export type ChatStreamEvent =
  | { event: 'token'; data: { token: string } }
  | { event: 'complete'; data: { messageId: string; tokens: number } }
  | { event: 'error'; data: { message: string } };

export type ChatMessageResponse = components['schemas']['ChatMessageResponseDto'];

export class ChatAPI {
  constructor(private readonly client: ApiClient) {}

  create(projectId: string, title?: string): Promise<ChatSession> {
    return this.client.post<ChatSession, CreateChatRequest>(`/projects/${projectId}/chat`, {
      title,
    });
  }

  list(projectId: string, signal?: AbortSignal): Promise<ChatListResponse> {
    return this.client.get<ChatListResponse>(`/projects/${projectId}/chat`, { signal });
  }

  remove(sessionId: string): Promise<void> {
    return this.client.delete<void>(`/chat/${sessionId}`);
  }
  getMessages(sessionId: string, signal?: AbortSignal): Promise<ChatMessageListResponse> {
    return this.client.get<ChatMessageListResponse>(`/chat/${sessionId}/messages`, { signal });
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
    onEvent: (event: ChatStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    return this.client.stream<ChatStreamEvent>(
      `/chat/${sessionId}/stream`,
      payload,
      onEvent,
      signal,
    );
  }
}
