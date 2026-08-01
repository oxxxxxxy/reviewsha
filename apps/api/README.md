# @reviewsha/api

NestJS 11 Backend API приложения «Ревьюша».

## Назначение

API отвечает за REST endpoints, Swagger/OpenAPI, конфигурацию, подключение Prisma и будущую бизнес-логику MVP.

На Этапе 3.1 реализован слой схемы данных: Prisma schema, первая миграция и idempotent seed. Сервисы, контроллеры и бизнес-endpoints ещё не реализуются.

## Запуск

```bash
yarn workspace @reviewsha/api dev
```

## Проверки

```bash
yarn workspace @reviewsha/api lint
yarn workspace @reviewsha/api typecheck
yarn workspace @reviewsha/api test
yarn workspace @reviewsha/api build

yarn workspace @reviewsha/api prisma:format
yarn workspace @reviewsha/api prisma:validate
yarn workspace @reviewsha/api prisma:generate
yarn workspace @reviewsha/api prisma:migrate
yarn workspace @reviewsha/api prisma:seed

yarn workspace @reviewsha/api test:prisma
yarn test:stage3
```

## ENV

Пример:

```txt
apps/api/.env.example
```

Основные переменные:

```env
API_PORT=3000
API_PREFIX=api/v1
DATABASE_URL=postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=http://localhost:9000
```

## Endpoints

```txt
GET /api/v1/health
GET /api/v1/docs
GET /api/v1/docs-json
```

## Зависимости

- NestJS 11
- Prisma 7
- PostgreSQL
- Zod
- Swagger
- `@reviewsha/config`
- `@reviewsha/types`

## Prisma

Файлы базы данных находятся в `apps/api/prisma`:

```txt
prisma/schema.prisma
prisma/migrations/
prisma/seed.ts
```

Схема использует Prisma 7, PostgreSQL datasource через `DATABASE_URL`, Prisma Client и Prisma Migrate.

`seed.ts` можно запускать многократно: критичные записи создаются через `upsert` и не дублируются.
