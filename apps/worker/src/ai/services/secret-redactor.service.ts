import { Injectable } from '@nestjs/common';

const SECRET_PATTERNS: RegExp[] = [
  /\bAKIA[0-9A-Z]{16}\b/gu,
  /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{16,}\b/gu,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/giu,
  /((?:password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key)\s*[:=]\s*["']?)[^\s"';,}]{4,}/giu,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gu,
];

@Injectable()
export class SecretRedactorService {
  redact(content: string): string {
    return SECRET_PATTERNS.reduce(
      (value, pattern) =>
        value.replace(pattern, (_match, prefix?: string) => `${prefix ?? ''}[REDACTED]`),
      content,
    );
  }
}
