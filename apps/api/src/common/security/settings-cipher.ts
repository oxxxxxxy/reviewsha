import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const VERSION = 'v1';

function keyFor(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

/** Encrypts administrative secrets before they are persisted in PostgreSQL. */
export function encryptSetting(value: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFor(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
}

export function decryptSetting(value: string, secret: string): string {
  const [version, iv, tag, ciphertext] = value.split(':');
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    // Development databases created before encrypted settings are supported
    // may contain a plain value. Keep reads backwards compatible and encrypt
    // it again on the next update.
    return value;
  }
  const decipher = createDecipheriv('aes-256-gcm', keyFor(secret), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
