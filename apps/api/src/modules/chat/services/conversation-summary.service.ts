import { Injectable } from '@nestjs/common';
import type { ChatMessage } from '@prisma/client';

@Injectable()
export class ConversationSummaryService {
  summarize(messages: ChatMessage[], maxCharacters = 4000): string {
    const chronological = [...messages].reverse();
    const text = chronological
      .map((message) => `${message.role}: ${message.content.replace(/\s+/gu, ' ').trim()}`)
      .join('\n');
    if (text.length <= maxCharacters) return text;
    return `${text.slice(0, maxCharacters - 20)}[summary truncated]`;
  }
}
