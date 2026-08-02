import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import type { AppConfig } from './config/app.config';
import { setupSwagger } from './swagger/swagger.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const appConfig = configService.getOrThrow<AppConfig>('app');

  app.setGlobalPrefix(appConfig.apiPrefix);

  app.enableCors({
    origin: appConfig.corsOrigin,
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  setupSwagger(app, appConfig.apiPrefix);

  await app.listen(appConfig.port, appConfig.host);

  console.log(
    `Reviewsha API listening on http://${appConfig.host}:${appConfig.port}/${appConfig.apiPrefix}`,
  );
  console.log(
    `Swagger available on http://${appConfig.host}:${appConfig.port}/${appConfig.apiPrefix}/docs`,
  );
}

void bootstrap();
