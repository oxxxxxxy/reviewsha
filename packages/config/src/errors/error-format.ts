export interface ErrorResponseBody {
  readonly code: string;
  readonly message: string;
}

export interface ErrorResponseEnvelope {
  readonly error: ErrorResponseBody;
}

export interface WorkerErrorBody {
  readonly queue: string;
  readonly jobId?: string;
  readonly error: string;
  readonly retryable: boolean;
  readonly timestamp: string;
}

export interface FrontendErrorBody {
  readonly message: string;
  readonly source: 'error-boundary' | 'global-handler' | 'api-client';
  readonly timestamp: string;
}

export function createErrorTimestamp(): string {
  return new Date().toISOString();
}

export function createApiErrorCode(errorName: string): string {
  return errorName
    .replace(/Exception$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase();
}
