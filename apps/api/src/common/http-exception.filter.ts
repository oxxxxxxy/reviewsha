import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { createErrorTimestamp, type ErrorResponseBody } from '@reviewsha/config';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof Error ? exception.message : 'Internal server error';

    const errorBody: ErrorResponseBody = {
      statusCode: status,
      error: exception instanceof HttpException ? exception.name : 'InternalServerError',
      message,
      path: request.url,
      timestamp: createErrorTimestamp(),
    };

    response.status(status).json({
      success: false,
      error: errorBody,
    });
  }
}
