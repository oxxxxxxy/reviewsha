import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ChatPaginationDto } from '../../../../src/modules/chat/dto/chat-query.dto';
import { CreateChatDto } from '../../../../src/modules/chat/dto/create-chat.dto';
import { SendMessageDto } from '../../../../src/modules/chat/dto/send-message.dto';

describe('Chat DTO validation', () => {
  it.each(['Question', ' Why JWT? ', 'x'.repeat(4000)])('accepts message %j', async (message) => {
    expect(await validate(plainToInstance(SendMessageDto, { message }))).toHaveLength(0);
  });

  it.each(['', ' ', '\n', 'x'.repeat(4001), 42, null, undefined])(
    'rejects invalid message %j',
    async (message) => {
      expect(await validate(plainToInstance(SendMessageDto, { message }))).not.toHaveLength(0);
    },
  );

  it.each([{}, { title: 'Auth review' }, { title: 'x'.repeat(180) }])(
    'accepts create payload %j',
    async (payload) => {
      expect(await validate(plainToInstance(CreateChatDto, payload))).toHaveLength(0);
    },
  );

  it.each([{ title: '' }, { title: 'x'.repeat(181) }, { title: 5 }])(
    'rejects create payload %j',
    async (payload) => {
      expect(await validate(plainToInstance(CreateChatDto, payload))).not.toHaveLength(0);
    },
  );

  it.each([
    [{}, 1, 50],
    [{ page: '2', limit: '10' }, 2, 10],
    [{ page: 3, limit: 100 }, 3, 100],
  ])('transforms pagination %j', async (payload, page, limit) => {
    const dto = plainToInstance(ChatPaginationDto, payload);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ page, limit });
  });

  it.each([{ page: 0 }, { page: -1 }, { page: 1.5 }, { limit: 0 }, { limit: 101 }, { limit: 1.2 }])(
    'rejects pagination %j',
    async (payload) => {
      expect(await validate(plainToInstance(ChatPaginationDto, payload))).not.toHaveLength(0);
    },
  );
});
