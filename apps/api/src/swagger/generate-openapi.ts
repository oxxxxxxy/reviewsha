import 'reflect-metadata';

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { createSwaggerDocument } from './swagger.config';

async function generateOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  const document = createSwaggerDocument(app);
  const outputPath = join(process.cwd(), '../../docs/generated/openapi.json');

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  await app.close();

  console.log(`OpenAPI ${document.openapi} generated at ${outputPath}`);
}

generateOpenApi().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
