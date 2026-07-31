import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { HttpExceptionFilter } from './http-exception.filter';

function createHost() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return {
    json,
    status,
    host: {
      switchToHttp: () => ({
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
      error: {
        statusCode: 400,
        message: 'Invalid payload',
      },
    });
  });

  it('formats unknown errors as 500', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(new Error('Boom'), host as never);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        statusCode: 500,
        message: 'Boom',
      },
    });
  });
});
