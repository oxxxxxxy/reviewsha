import { createDecipheriv, createHash } from 'node:crypto';

const VERSION = 'v1';

function keyFor(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function decryptSetting(value: string, secret: string): string {
  const [version, iv, tag, ciphertext] = value.split(':');
  if (version !== VERSION || !iv || !tag || !ciphertext) return value;
  const decipher = createDecipheriv('aes-256-gcm', keyFor(secret), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
