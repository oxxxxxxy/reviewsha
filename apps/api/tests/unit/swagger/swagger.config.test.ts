import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';
import { OPENAPI_VERSION } from '../../../src/swagger/swagger.config';

const apiRoot = join(process.cwd());
const openApiPath = join(apiRoot, '../../docs/generated/openapi.json');

type OpenApiDocument = {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, { security?: Array<Record<string, never[]>> }>>;
  components?: {
    securitySchemes?: Record<string, unknown>;
    schemas?: Record<string, unknown>;
  };
};

let document: OpenApiDocument;

function generateDocument(): OpenApiDocument {
  execFileSync('yarn', ['docs:openapi'], {
    cwd: apiRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return JSON.parse(readFileSync(openApiPath, 'utf8')) as OpenApiDocument;
}

describe('Swagger OpenAPI document', () => {
  beforeAll(() => {
    document = generateDocument();
  }, 30_000);

  it('generates OpenAPI 3.1 metadata with bearer authentication', () => {
    expect(document.openapi).toBe(OPENAPI_VERSION);
    expect(document.info.title).toBe('Reviewsha API');
    expect(document.info.version).toBe('1.0.0');
    expect(document.components?.securitySchemes?.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });

  it('documents current controllers, DTO schemas and route security', () => {
    expect(document.paths['/auth/register']?.post?.security).toBeUndefined();
    expect(document.paths['/auth/me']?.get?.security).toEqual([{ bearer: [] }]);
    expect(document.paths['/users']?.get?.security).toEqual([{ bearer: [] }]);
    expect(document.paths['/sessions']?.get?.security).toEqual([{ bearer: [] }]);
    expect(document.paths['/health']?.get).toBeDefined();
    expect(document.components?.schemas?.UserResponseDto).toBeDefined();
    expect(document.components?.schemas?.AuthResponseDto).toBeDefined();
    expect(document.components?.schemas?.SessionResponseDto).toBeDefined();
    expect(document.components?.schemas?.ApiErrorResponseDto).toBeDefined();
  });
});
