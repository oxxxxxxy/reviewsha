import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatSecretFilterService {
  redact(value: string): string {
    return value
      .replace(/\b(Bearer)\s+[A-Za-z0-9._~+/=-]+/giu, '$1 [REDACTED]')
      .replace(
        /\b(api[_-]?key|secret|password|token|authorization)\b\s*[:=]\s*["']?[^\s,"'}]+/giu,
        '$1=[REDACTED]',
      )
      .replace(/\b(?:sk|pk)-[A-Za-z0-9_-]{16,}\b/gu, '[REDACTED]');
  }
}
