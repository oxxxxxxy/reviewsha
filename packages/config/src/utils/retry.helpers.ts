export interface RetryBackoffOptions {
  readonly attempt: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
}

export function calculateExponentialBackoff({
  attempt,
  baseDelayMs = 1000,
  maxDelayMs = 30_000,
}: RetryBackoffOptions): number {
  return Math.min(baseDelayMs * 2 ** Math.max(attempt - 1, 0), maxDelayMs);
}
