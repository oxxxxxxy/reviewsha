import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { API_BASE_PATH } from '@reviewsha/config';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';

export const SWAGGER_PATH = 'docs';
export const SWAGGER_JSON_PATH = 'docs-json';
export const OPENAPI_VERSION = '3.1.0';

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Reviewsha API')
    .setDescription(
      [
        'Ревьюша API — AI SaaS platform for automated code review.',
        '',
        'The API is versioned under `/api/v1`, uses JWT Bearer authentication for protected endpoints, and is intended for Frontend, Admin and SDK integrations.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .setLicense('UNLICENSED', 'https://github.com/oxxxxxxy/reviewsha')
    .setContact(
      'Reviewsha Team',
      'https://github.com/oxxxxxxy/reviewsha',
      'support@reviewsha.local',
    )
    .setExternalDoc('Repository', 'https://github.com/oxxxxxxy/reviewsha')
    .addServer(`/${API_BASE_PATH}`, 'Local API v1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        name: 'Authorization',
        description: 'Paste an access token without the `Bearer` prefix.',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ApiErrorResponseDto],
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
  });

  return {
    ...document,
    openapi: OPENAPI_VERSION,
  };
}

export function setupSwagger(app: INestApplication, apiPrefix: string): OpenAPIObject {
  const document = createSwaggerDocument(app);

  SwaggerModule.setup(`${apiPrefix}/${SWAGGER_PATH}`, app, document, {
    jsonDocumentUrl: `${apiPrefix}/${SWAGGER_JSON_PATH}`,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  return document;
}
