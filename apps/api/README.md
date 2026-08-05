# @reviewsha/api

NestJS 11 Backend API приложения «Ревьюша».

## Назначение

API отвечает за REST endpoints, Swagger/OpenAPI, конфигурацию, подключение Prisma и будущую бизнес-логику MVP.

На Этапах 3.1–3.5 реализован фундамент базы данных: Prisma schema, миграции, idempotent seed, единый `PrismaService`, `DatabaseModule`, PostgreSQL health check и Repository Layer. Этапы 5.1–5.2 добавляют ownership-aware Projects API, lifecycle, теги и историю изменений.

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
yarn test:stage5
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
GET /api/v1/projects
GET /api/v1/projects/:id
POST /api/v1/projects
PATCH /api/v1/projects/:id
POST /api/v1/projects/:id/archive
DELETE /api/v1/projects/:id
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

## Projects Module

Projects находится в `src/modules/projects` и использует цепочку `ProjectsController → ProjectsService → ProjectRepository`.

Обычный пользователь видит и изменяет только собственные проекты. Администратор может работать с любыми проектами. Список поддерживает pagination, поиск, фильтры статуса/visibility/языка/тегов/дат и сортировку. Удаление — soft delete, архивирование и восстановление меняют lifecycle status. Ответы соответствуют API envelope `{ data, meta }`.

Жизненный цикл публикует `project.created`, `project.updated`, `project.archived`, `project.restored`, `project.deleted`, `project.tag.added` и `project.tag.removed`. Теги хранятся в `project_tags`, история — в `project_history`.

```txt
GET  /api/v1/projects/:id/history
POST /api/v1/projects/:id/restore
```

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

## JWT Infrastructure

JWT operations are centralized in `TokenService`:

```txt
src/modules/auth/services/token.service.ts
```

Rules:

- Auth/business services do not call `JwtService.sign()` or `JwtService.verify()` directly.
- `JwtAuthGuard` and `RefreshAuthGuard` verify tokens through `TokenService`.
- JWT configuration lives in `src/config/jwt.config.ts` and is populated from ENV.
- Refresh Token is stored only as hash in PostgreSQL.
- JWT and Refresh Token values are never logged.

## Session Module

`src/modules/sessions` owns Refresh Token and session lifecycle.

Endpoints:

```txt
GET    /api/v1/sessions
DELETE /api/v1/sessions/:id
```

Rules:

- AuthService uses SessionService for Refresh Token lifecycle.
- Refresh Token is stored only as Argon2 hash.
- Refresh JWT `jti` is stored and used to locate the session record.
- Rotation revokes the old session.
- Reuse detection revokes all active sessions.
- `MAX_SESSIONS_PER_USER` limits active sessions per user.

## Roles & Authorization

RBAC definitions live in `src/common/authorization`.

Rules:

- Use `APP_ROLES` instead of string role literals.
- Use `AUTHORIZATION_POLICIES` for endpoint access rules.
- Public endpoints use `@Public()`.
- Protected endpoints use `@Roles(...)`.
- `RolesGuard` is global and checks `@Roles(...)` metadata.

## Swagger & OpenAPI

Runtime documentation:

```txt
/api/v1/docs
/api/v1/docs-json
```

Contract generation:

```bash
yarn workspace @reviewsha/api docs:openapi
```

All protected endpoints use `@ApiBearerAuth('bearer')`; public endpoints are marked with `@Public()`.

## Storage Module

`StorageService` — единственная точка доступа API к MinIO. Реализация находится в
`src/modules/storage`; `MinioProvider` инкапсулирует SDK и создаёт bucket'ы
`projects`, `reports` и `temp`. Поддерживаются stream upload/download, metadata,
exists, copy, move, delete и presigned URL.

## Upload Module

`UploadsModule` принимает ZIP-архивы через:

```http
POST /api/v1/projects/:projectId/uploads
GET  /api/v1/projects/:projectId/uploads
```

Загрузка доступна владельцу проекта или администратору. До сохранения модуль
проверяет размер, MIME/расширение, CRC и структуру ZIP, traversal, запрещённые
каталоги, число записей, распакованный размер и коэффициент сжатия. После этого
архив получает SHA-256 checksum, последовательную версию и детерминированный
storage key, а запись сохраняется через `UploadedFileRepository`. MinIO доступен
только через `StorageService`; событие `upload.completed` запускает PipelineModule.

## Queue Module

`QueueService` is the API-facing BullMQ abstraction. Queue names are imported from
`@reviewsha/config` (`scan.queue`, `file.queue`, `ai.queue`, `report.queue`,
`notification.queue` and `dead-letter.queue`). Use `addJob`, `getJobStatus`,
`retryJob`, `pauseQueue` and `resumeQueue`; do not instantiate `Queue` in domain
modules. Job payloads contain only small JSON-safe identifiers and never file
contents, secrets or tokens.

`PipelineModule` consumes `upload.completed` and orchestrates
`extract → parse → analyze → merge → report → notify`. State and progress are
stored in `Scan`; exhausted or permanent failures go to `dead-letter.queue`.
The authenticated API exposes `GET /api/v1/pipelines/:id`, plus resume and
cancel actions, with owner/admin access checks. Queue and pipeline metrics are
available through `QueueService.getAllQueueMetrics()` and
`PipelineService.getMetrics()` for future monitoring and Admin UI.
