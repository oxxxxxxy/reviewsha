# `@reviewsha/api`

NestJS 11 HTTP API. Отвечает за authentication, projects, uploads, pipeline
state, reports, chat, admin operations, health и OpenAPI.

## Запуск

```bash
yarn workspace @reviewsha/api dev
yarn workspace @reviewsha/api start
```

API слушает `http://localhost:3000/api/v1` по умолчанию. Swagger UI доступен на
`/api/v1/docs`, JSON contract — на `/api/v1/docs-json`.

## Проверки

```bash
yarn workspace @reviewsha/api lint
yarn workspace @reviewsha/api typecheck
yarn workspace @reviewsha/api test
yarn workspace @reviewsha/api build
yarn workspace @reviewsha/api docs:openapi
```

## Prisma

```bash
yarn workspace @reviewsha/api prisma:format
yarn workspace @reviewsha/api prisma:validate
yarn workspace @reviewsha/api prisma:generate
yarn workspace @reviewsha/api prisma:migrate
yarn workspace @reviewsha/api prisma:deploy
yarn workspace @reviewsha/api prisma:seed
yarn workspace @reviewsha/api prisma:studio
```

`prisma:reset` уничтожает development database и не используется в production.
Подробнее: [database guide](../../docs/development/database.md).

## Boundaries

Controller → DTO/guards → Service → Repository/QueueService. Тяжёлые parsing,
AI и report jobs выполняются в `apps/worker`, а не в HTTP request.
