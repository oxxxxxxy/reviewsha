export interface ErrorResponseBody {
  readonly statusCode: number;
  readonly error: string;
  readonly message: string | readonly string[];
  readonly path: string;
  readonly timestamp: string;
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
