import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
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
import { Inject } from '@nestjs/common';
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
    @Inject(ChatService) private readonly chat: ChatService,
    @Inject(ChatSessionService) private readonly sessions: ChatSessionService,
    @Inject(ChatStreamingService) private readonly streaming: ChatStreamingService,
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

  @Delete('chat/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an owned chat session' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'The chat belongs to another user.' })
  @ApiNotFoundResponse({ description: 'Chat session not found.' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<void> {
    await this.sessions.remove(user, sessionId);
  }

  @Get('chat/:sessionId')
  @ApiOperation({ summary: 'Get an owned chat session' })
  @ApiOkResponse({ type: ChatSessionResponseDto })
  @ApiForbiddenResponse({ description: 'The chat belongs to another user.' })
  @ApiNotFoundResponse({ description: 'Chat session not found.' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.sessions.get(user, sessionId);
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
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Stable client key used to safely retry the same message submission.',
  })
  @ApiBadRequestResponse({ description: 'The message or idempotency key is invalid.' })
  @ApiCreatedResponse({ type: ChatMessageResponseDto })
  @ApiServiceUnavailableResponse({ description: 'AI provider is unavailable.' })
  @ApiGatewayTimeoutResponse({ description: 'AI response timed out.' })
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SendMessageDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.chat.send(user, sessionId, {
      ...dto,
      idempotencyKey: dto.idempotencyKey?.trim() || idempotencyKey?.trim() || undefined,
    });
  }

  @Post('chat/:sessionId/stream')
  @ApiOperation({ summary: 'Stream a Reviewsha AI answer over Server-Sent Events' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Stable client key used to safely retry the same stream submission.',
  })
  @ApiBadRequestResponse({ description: 'The message or idempotency key is invalid.' })
  @ApiProduces('text/event-stream')
  async stream(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SendMessageDto,
    @Res() response: Response,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<void> {
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();
    const abort = new AbortController();
    response.on('close', () => abort.abort());
    try {
      const request = {
        ...dto,
        idempotencyKey: dto.idempotencyKey?.trim() || idempotencyKey?.trim() || undefined,
      };
      for await (const item of this.streaming.stream(user, sessionId, request, abort.signal)) {
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
