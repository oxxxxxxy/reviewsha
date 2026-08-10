import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiGatewayTimeoutResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiProduces,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/decorators/current-user.decorator';
import { Ownership } from '../../../common/auth/decorators/ownership.decorator';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import { ApiStandardErrors } from '../../../common/swagger';
import {
  ChatMessageListResponseDto,
  ChatMessageResponseDto,
  ChatSessionListResponseDto,
  ChatSessionResponseDto,
} from '../dto/chat-response.dto';
import { ChatPaginationDto } from '../dto/chat-query.dto';
import { CreateChatDto } from '../dto/create-chat.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { ChatService } from '../services/chat.service';
import { ChatSessionService } from '../services/chat-session.service';
import { ChatStreamingService } from '../services/chat-streaming.service';

@ApiTags('Chat')
@ApiBearerAuth('bearer')
@ApiStandardErrors()
@Controller()
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly sessions: ChatSessionService,
    private readonly streaming: ChatStreamingService,
  ) {}

  @Post('projects/:id/chat')
  @Ownership('project')
  @ApiOperation({ summary: 'Create a project chat session' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ type: ChatSessionResponseDto })
  @ApiForbiddenResponse({ description: 'The project belongs to another user.' })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateChatDto,
  ) {
    return this.sessions.create(user, projectId, dto);
  }

  @Get('projects/:id/chat')
  @Ownership('project')
  @ApiOperation({ summary: 'List project chat sessions' })
  @ApiOkResponse({ type: ChatSessionListResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query() query: ChatPaginationDto,
  ) {
    return this.sessions.list(user, projectId, query);
  }

  @Get('chat/:sessionId/messages')
  @ApiOperation({ summary: 'Get paginated chat history' })
  @ApiOkResponse({ type: ChatMessageListResponseDto })
  @ApiForbiddenResponse({ description: 'The chat belongs to another user.' })
  @ApiNotFoundResponse({ description: 'Chat session not found.' })
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query() query: ChatPaginationDto,
  ) {
    return this.chat.history(user, sessionId, query);
  }

  @Post('chat/:sessionId/messages')
  @ApiOperation({ summary: 'Send a message to Reviewsha AI' })
  @ApiCreatedResponse({ type: ChatMessageResponseDto })
  @ApiServiceUnavailableResponse({ description: 'AI provider is unavailable.' })
  @ApiGatewayTimeoutResponse({ description: 'AI response timed out.' })
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.send(user, sessionId, dto);
  }

  @Post('chat/:sessionId/stream')
  @ApiOperation({ summary: 'Stream a Reviewsha AI answer over Server-Sent Events' })
  @ApiProduces('text/event-stream')
  async stream(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SendMessageDto,
    @Res() response: Response,
  ): Promise<void> {
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();
    const abort = new AbortController();
    response.on('close', () => abort.abort());
    try {
      for await (const item of this.streaming.stream(user, sessionId, dto, abort.signal)) {
        response.write(`event: ${item.event}\ndata: ${JSON.stringify(item.data)}\n\n`);
      }
    } catch (error) {
      if (!abort.signal.aborted) {
        response.write(
          `event: error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : 'Streaming failed' })}\n\n`,
        );
      }
    } finally {
      response.end();
    }
  }
}
