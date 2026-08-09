import { describe, expect, it } from 'vitest';
import { ChatSecretFilterService } from '../../../../src/modules/chat/services/chat-secret-filter.service';

describe('ChatSecretFilterService', () => {
  const service = new ChatSecretFilterService();

  it.each([
    ['Bearer abc.def.ghi', 'Bearer [REDACTED]'],
    ['api_key=top-secret-value', 'api_key=[REDACTED]'],
    ['password: hunter2', 'password=[REDACTED]'],
    ['token="private-token"', 'token=[REDACTED]'],
    ['sk-abcdefghijklmnopqrstuvwxyz', '[REDACTED]'],
  ])('redacts %s', (input, expected) => expect(service.redact(input)).toContain(expected));

  it.each(['JWT validation failed', 'src/auth/auth.service.ts', 'No secrets here'])(
    'preserves safe text %s',
    (input) => expect(service.redact(input)).toBe(input),
  );
});
