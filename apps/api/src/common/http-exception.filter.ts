import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { createApiErrorCode, type ErrorResponseBody } from '@reviewsha/config';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorName = exception instanceof HttpException ? exception.name : 'InternalServerError';
    const message = exception instanceof Error ? exception.message : 'Internal server error';

    const errorBody: ErrorResponseBody = {
      code: createApiErrorCode(errorName),
      message,
    };

    response.status(status).json({
      error: errorBody,
    });
  }
}
