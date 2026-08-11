import { Injectable, Optional, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { AuditLogService } from '../../database/audit-log.service';
import { ApiLoggerService } from './api-logger.service';

type RequestWithId = Request & { requestId?: string; user?: { id?: string } };

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(
    @Optional() private readonly logger?: ApiLoggerService,
    @Optional() private readonly audit?: AuditLogService,
  ) {}

  use(request: RequestWithId, response: Response, next: NextFunction): void {
    const supplied = request.header('x-request-id')?.trim();
    const requestId =
      supplied && /^[A-Za-z0-9._:-]{1,120}$/u.test(supplied) ? supplied : randomUUID();
    const startedAt = Date.now();
    request.requestId = requestId;
    response.setHeader('X-Request-ID', requestId);
    response.once('finish', () => {
      this.logger?.log('HTTP request completed', 'RequestLogger', {
        event: 'http.request.completed',
        requestId,
        metadata: {
          method: request.method,
          path: request.originalUrl,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
        },
      });
      if (/^(POST|PUT|PATCH|DELETE)$/u.test(request.method)) {
        const parts = request.path.split('/').filter(Boolean);
        void this.audit
          ?.record({
            actorId: request.user?.id,
            action: `http.${request.method.toLowerCase()}.${response.statusCode < 400 ? 'success' : 'failed'}`,
            entityType: parts.find((part) => !part.startsWith('api')) ?? 'http',
            entityId: parts.find((part) => /^[0-9a-f-]{36}$/iu.test(part)),
            requestId,
            metadata: { path: request.path, statusCode: response.statusCode },
          })
          ?.catch((error: unknown) => {
            this.logger?.error(
              'Audit record persistence failed',
              error instanceof Error ? error.stack : undefined,
              'AuditLogService',
              { event: 'audit.persistence.failed', requestId },
            );
          });
      }
    });
    next();
  }
}
