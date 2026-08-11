import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import type { SendMessageDto } from '../dto/send-message.dto';
import { ChatService } from './chat.service';
import { ChatStreamBrokerService } from './chat-stream-broker.service';

export type ChatStreamEvent =
  | { event: 'token'; data: { token: string } }
  | { event: 'complete'; data: { messageId: string; tokens: number } };

@Injectable()
export class ChatStreamingService {
  private readonly chat: ChatService;
  private readonly broker: ChatStreamBrokerService;

  constructor(
    @Inject(ChatService) chat: ChatService,
    @Inject(ChatStreamBrokerService) broker: ChatStreamBrokerService,
  ) {
    this.chat = chat;
    this.broker = broker;
  }

  async *stream(
    user: AuthenticatedUser,
    sessionId: string,
    dto: SendMessageDto,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatStreamEvent> {
    const streamId = randomUUID();
    const subscription = await this.broker.open(streamId, signal);
    let content = '';
    try {
      await this.chat.startStream(user, sessionId, dto, streamId);
      for await (const item of subscription) {
        if (item.type === 'token') {
          content += item.token;
          yield { event: 'token', data: { token: item.token } };
        } else if (item.type === 'error') {
          throw new Error(item.message);
        } else {
          await this.chat.finishStream(user, sessionId, dto.message.trim(), content);
          yield {
            event: 'complete',
            data: { messageId: item.messageId, tokens: item.tokens },
          };
        }
      }
    } finally {
      await subscription.cancel();
    }
  }
}
