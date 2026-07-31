import type { ApiClient } from '../client/api-client.js';

export interface ChatMessageRequest {
  readonly projectId?: string;
  readonly reportId?: string;
  readonly message: string;
}

export interface ChatMessageResponse {
  readonly id: string;
  readonly answer: string;
  readonly createdAt: string;
}

export class ChatAPI {
  constructor(private readonly client: ApiClient) {}

  sendMessage(payload: ChatMessageRequest): Promise<ChatMessageResponse> {
    return this.client.post<ChatMessageResponse, ChatMessageRequest>('/chat/messages', payload);
  }
}
