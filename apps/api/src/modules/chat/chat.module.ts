import { Module } from '@nestjs/common';
import { ApiLoggerService } from '../../common/logger/api-logger.service';
import { ChatController } from './controllers/chat.controller';
import { ChatRepository } from './repositories/chat.repository';
import { ChatContextService } from './services/chat-context.service';
import { ChatService } from './services/chat.service';
import { ChatSessionService } from './services/chat-session.service';
import { ChatSecretFilterService } from './services/chat-secret-filter.service';
import { ChatContextCacheService } from './services/chat-context-cache.service';
import { ChatMemoryService } from './services/chat-memory.service';
import { ConversationSummaryService } from './services/conversation-summary.service';
import { ChatStreamingService } from './services/chat-streaming.service';
import { ChatStreamBrokerService } from './services/chat-stream-broker.service';

@Module({
  controllers: [ChatController],
  providers: [
    ApiLoggerService,
    ChatRepository,
    ChatService,
    ChatContextService,
    ChatSecretFilterService,
    ChatContextCacheService,
    ChatMemoryService,
    ConversationSummaryService,
    ChatStreamingService,
    ChatStreamBrokerService,
    ChatSessionService,
  ],
  exports: [ChatService, ChatContextService, ChatSessionService],
})
export class ChatModule {}
