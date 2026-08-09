import { MessageRole } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { ConversationSummaryService } from '../../../../src/modules/chat/services/conversation-summary.service';

describe('ConversationSummaryService', () => {
  const service = new ConversationSummaryService();
  const message = (content: string, role: MessageRole = MessageRole.USER) =>
    ({ role, content }) as never;

  it('summarizes an empty conversation', () => expect(service.summarize([])).toBe(''));
  it('includes roles', () => expect(service.summarize([message('hello')])).toBe('USER: hello'));
  it('normalizes whitespace', () =>
    expect(service.summarize([message('a   b\n c')])).toContain('a b c'));
  it('restores chronological order', () =>
    expect(service.summarize([message('second'), message('first')])).toBe(
      'USER: first\nUSER: second',
    ));
  it.each([20, 50, 100, 500])('respects %i character limit', (limit) =>
    expect(service.summarize([message('x'.repeat(1000))], limit).length).toBeLessThanOrEqual(limit),
  );
  it('marks a truncated summary', () =>
    expect(service.summarize([message('x'.repeat(1000))], 100)).toContain('[summary truncated]'));
  it('preserves assistant role', () =>
    expect(service.summarize([message('answer', MessageRole.ASSISTANT)])).toContain('ASSISTANT'));
});
