import { randomUUID } from 'node:crypto';
import type { QueueJobData, QueueJobPayload } from './queue.constants';

const SENSITIVE_KEYS = new Set(['password', 'passwordhash', 'secret', 'token', 'refreshtoken']);

export function buildQueueJob(type: string, payload: QueueJobPayload = {}): QueueJobData {
  if (!type.trim()) throw new Error('Queue job type is required');
  assertSafePayload(payload);
  const serialized = JSON.stringify(payload, (_key, value: unknown) => {
    if (typeof value === 'bigint') {
      throw new Error('Queue job payload must contain JSON-safe identifiers only');
    }
    return value;
  });
  if (serialized.length > 64 * 1024) throw new Error('Queue job payload is too large');
  return { id: randomUUID(), type, payload, createdAt: new Date().toISOString() };
}

function assertSafePayload(value: unknown, key?: string): void {
  if (key && SENSITIVE_KEYS.has(key.toLowerCase())) {
    throw new Error('Queue job payload contains a secret');
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array || typeof value === 'bigint') {
    throw new Error('Queue job payload must contain JSON-safe identifiers only');
  }
  if (Array.isArray(value)) {
    value.forEach((item) => assertSafePayload(item));
  } else if (value && typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) {
      assertSafePayload(childValue, childKey);
    }
  }
}
