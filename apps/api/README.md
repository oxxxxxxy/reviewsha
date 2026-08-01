# @reviewsha/api

NestJS 11 Backend API приложения «Ревьюша».

## Назначение

API отвечает за REST endpoints, Swagger/OpenAPI, конфигурацию, подключение Prisma и будущую бизнес-логику MVP.

На Этапе 2 бизнес-логика не реализуется.

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
GET /api/docs
GET /api/docs-json
```

## Зависимости

- NestJS 11
- Prisma 7
- PostgreSQL
- Zod
- Swagger
- `@reviewsha/config`
- `@reviewsha/types`
