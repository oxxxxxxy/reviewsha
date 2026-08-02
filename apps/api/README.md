# @reviewsha/api

NestJS 11 Backend API приложения «Ревьюша».

## Назначение

API отвечает за REST endpoints, Swagger/OpenAPI, конфигурацию, подключение Prisma и будущую бизнес-логику MVP.

На Этапах 3.1–3.5 реализован фундамент базы данных: Prisma schema, миграции, idempotent seed, единый `PrismaService`, `DatabaseModule`, PostgreSQL health check и Repository Layer. Бизнес-endpoints ещё не реализуются.

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
yarn workspace @reviewsha/api prisma:deploy
yarn workspace @reviewsha/api prisma:reset
yarn workspace @reviewsha/api prisma:studio
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
- Repository Layer
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
prisma/seeds/
```

Схема использует Prisma 7, PostgreSQL datasource через `DATABASE_URL`, Prisma Client и Prisma Migrate.

`seed.ts` можно запускать многократно: критичные записи создаются через `upsert` и не дублируются.

## Миграции

Development workflow:

```bash
yarn workspace @reviewsha/api prisma:format
yarn workspace @reviewsha/api prisma:validate
yarn workspace @reviewsha/api prisma:migrate
yarn workspace @reviewsha/api prisma:generate
yarn test:stage3
```

Production workflow:

```bash
yarn workspace @reviewsha/api prisma:deploy
```

Локальный reset с seed:

```bash
yarn workspace @reviewsha/api prisma:reset
```

Правила миграций описаны в `docs/implementation/stage-3-2-migrations.md` и `docs/development/standards.md`.

## Seed

`prisma/seed.ts` не содержит бизнес-логики и только запускает seed pipeline. Данные разделены по модулям `prisma/seeds/*`.

Создаются:

- `admin@reviewsha.local`;
- `developer@reviewsha.local`;
- `demo@reviewsha.local`;
- проекты `NestJS API`, `React Dashboard`, `Linux Scripts`;
- uploaded files, scans, scan steps, report, 24 findings, AI requests, chat messages и queue jobs.

Повторный запуск `yarn workspace @reviewsha/api prisma:seed` не создаёт дубликаты.

## Prisma Client

`src/database/prisma.service.ts` — единственное место в runtime-коде API, где создаётся Prisma Client. Сервис подключается к PostgreSQL при старте NestJS, закрывает соединение при shutdown, поддерживает `$transaction()` и используется health endpoint.

`PRISMA_LOG_QUERIES=true` включает логирование SQL-запросов в dev/debug окружении.

## Repository Layer

Репозитории находятся в `src/repositories/**` и экспортируются через `RepositoriesModule`.

Реализованы репозитории для `User`, `Project`, `UploadedFile`, `Scan`, `Report`, `Finding`, `RefreshToken`, `QueueJob`, `ChatSession`, `ChatMessage`.

Правило: будущие сервисы получают данные только через репозитории и не обращаются к `PrismaService` напрямую, кроме инфраструктурных health checks. Для транзакций используется `RepositoryOptions.tx`.

## Users Module

CRUD пользователей находится в `src/modules/users`.

Endpoints:

```txt
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id
```

Модуль использует `UsersController → UsersService → UserRepository`, DTO validation, Swagger decorators и `UserMapper`. Наружу никогда не возвращается `passwordHash`.

## Auth Module

JWT-аутентификация находится в `src/modules/auth`.

Endpoints:

```txt
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/logout-all
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
```

Модуль использует `AuthController → AuthService → UserRepository/RefreshTokenRepository`, Argon2 для паролей, hash Refresh Token, refresh rotation, Passport JWT strategies, guards и decorators.

Переменные окружения:

```env
JWT_SECRET=change-me-access
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change-me-refresh
JWT_REFRESH_EXPIRES_IN=30d
JWT_ISSUER=reviewsha-api
JWT_AUDIENCE=reviewsha-clients
```
