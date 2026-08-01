import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { HttpExceptionFilter } from '../../../src/common/http-exception.filter';

function createHost() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return {
    json,
    status,
    host: {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/api/test' }),
        getResponse: () => ({ status }),
      }),
    },
  };
}

describe('HttpExceptionFilter', () => {
  it('formats HttpException response', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(new BadRequestException('Invalid payload'), host as never);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: expect.objectContaining({
        statusCode: 400,
        error: 'BadRequestException',
        message: 'Invalid payload',
        path: '/api/test',
      }),
    });
  });

  it('formats unknown errors as 500', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(new Error('Boom'), host as never);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: expect.objectContaining({
        statusCode: 500,
        error: 'InternalServerError',
        message: 'Boom',
        path: '/api/test',
      }),
    });
  });
});
