import type { ApiClient } from '../client/api-client.js';

export interface CreateReportChatResponse {
  readonly chatId: string;
}

export interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly message: string;
  readonly createdAt: string;
}

export interface ChatMessageRequest {
  readonly message: string;
}

export interface ChatMessageResponse {
  readonly id: string;
  readonly answer: string;
  readonly createdAt: string;
}

export class ChatAPI {
  constructor(private readonly client: ApiClient) {}

  createForReport(reportId: string): Promise<CreateReportChatResponse> {
    return this.client.post<CreateReportChatResponse>(`/reports/${reportId}/chats`);
  }

  getMessages(chatId: string): Promise<readonly ChatMessage[]> {
    return this.client.get<readonly ChatMessage[]>(`/chats/${chatId}/messages`);
  }

  sendMessage(chatId: string, payload: ChatMessageRequest): Promise<ChatMessageResponse> {
    return this.client.post<ChatMessageResponse, ChatMessageRequest>(
      `/chats/${chatId}/messages`,
      payload,
    );
  }
}
