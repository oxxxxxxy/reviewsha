import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import type { SendMessageDto } from '../dto/send-message.dto';
import { ChatService } from './chat.service';

export type ChatStreamEvent =
  | { event: 'token'; data: { token: string } }
  | { event: 'complete'; data: { messageId: string; tokens: number } };

@Injectable()
export class ChatStreamingService {
  constructor(@Inject(ChatService) private readonly chat: ChatService) {}

  async *stream(
    user: AuthenticatedUser,
    sessionId: string,
    dto: SendMessageDto,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatStreamEvent> {
    const response = await this.chat.send(user, sessionId, dto);
    for (const token of response.content.match(/\S+\s*/gu) ?? []) {
      if (signal?.aborted) return;
      yield { event: 'token', data: { token } };
    }
    if (!signal?.aborted) {
      yield {
        event: 'complete',
        data: { messageId: response.id, tokens: response.tokens },
      };
    }
  }
}
