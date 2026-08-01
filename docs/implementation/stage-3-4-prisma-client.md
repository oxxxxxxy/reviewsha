# Этап 3.4 — Prisma Client

**Статус:** ✅ COMPLETE

## Результат

Backend получил единый слой подключения к PostgreSQL через `PrismaService` и глобальный `DatabaseModule`.

## Реализация

```txt
apps/api/src/database/
├── database.module.ts
└── prisma.service.ts
```

`PrismaService`:

- наследует `PrismaClient`;
- использует Prisma 7 + `@prisma/adapter-pg`;
- получает `DATABASE_URL` через `ConfigService`;
- выполняет `$connect()` в `onModuleInit()`;
- выполняет `$disconnect()` в `onModuleDestroy()`;
- поддерживает `$transaction()`;
- включает Prisma logs `error`, `warn`, `info` и опциональный `query` через `PRISMA_LOG_QUERIES=true`;
- предоставляет `healthCheck()` через `SELECT 1`.

`DatabaseModule` объявлен `@Global()` и экспортирует `PrismaService`.

## Health Check

`GET /api/v1/health` теперь проверяет доступность PostgreSQL через `PrismaService.healthCheck()`.

Если БД недоступна, API возвращает корректную ошибку сервиса, а не падает аварийно.

## Правила

- В `apps/api/src/**` запрещено создавать `new PrismaClient()` вне `database/prisma.service.ts`.
- CLI seed остаётся отдельным Prisma bootstrap в `apps/api/prisma/seed.ts`.
- Будущие сервисы получают доступ к БД только через DI.

## Проверки

Покрыто unit и Stage 3 acceptance tests:

- создание `PrismaService`;
- connect/disconnect lifecycle;
- singleton через Nest DI;
- health check;
- транзакция;
- запрет дополнительных app-level `new PrismaClient()`.
