# Ревьюша

AI SaaS platform for automated code review.

## Текущее состояние проекта

| Этап                               | Статус      | Результат                                                                                     |
| ---------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| Этап 1. Проектирование системы     | ✅ COMPLETE | Архитектура, backend/frontend/worker/storage/queue/database проектирование, draw.io диаграммы |
| 2.1 Yarn Workspaces                | ✅ COMPLETE | Инициализирован Yarn Classic monorepo                                                         |
| 2.2 Создание приложений            | ✅ COMPLETE | Созданы `api`, `web`, `admin`, `worker`                                                       |
| 2.3 Shared Packages                | ✅ COMPLETE | Созданы `config`, `types`, `sdk`, `ui`                                                        |
| 2.4 Docker Compose                 | ✅ COMPLETE | Локальная инфраструктура PostgreSQL, Redis, MinIO                                             |
| 2.5 Базовая инфраструктура проекта | ✅ COMPLETE | ENV, config, logging, errors, aliases, hooks, IDE, standards                                  |
| 2.6 CI/CD — GitHub Actions         | ✅ COMPLETE | Автоматические проверки на push, pull request и ручной запуск                                 |
| 3.1 Prisma Schema                  | ✅ COMPLETE | Полная Prisma-схема, первая миграция, seed, Prisma Client и Stage 3 acceptance tests          |
| 3.2 Миграции                       | ✅ COMPLETE | Prisma Migrate workflow, reset/deploy/dev scripts, CI checks и документация                   |
| 3.3 Seed                           | ✅ COMPLETE | Модульный deterministic seed для dev/test/demo данных                                         |
| 3.4 Prisma Client                  | ✅ COMPLETE | Единый PrismaService, DatabaseModule, health check PostgreSQL и транзакции                    |
| 3.5 Repository Layer               | ✅ COMPLETE | Репозитории для MVP-сущностей, интерфейсы, DI и unit-тесты                                    |
| 4.1 Users Module                   | ✅ COMPLETE | CRUD пользователей, DTO validation, Swagger, поиск, пагинация и сортировка                    |
| 4.2 Auth Module                    | ✅ COMPLETE | JWT auth, Argon2 passwords, refresh rotation, guards, roles and sessions                      |
| 4.3 JWT Infrastructure             | ✅ COMPLETE | Централизованный TokenService, JwtConfig, verify/decode/hash и TokenService-backed guards     |
| 4.4 Refresh Token & Sessions       | ✅ COMPLETE | SessionModule, SessionService, rotation, reuse detection, session list/revoke and cleanup     |
| 4.5 Guards                         | ✅ COMPLETE | Common auth guards/decorators, global JWT protection, roles, ownership and API key guard      |
| 4.6 Roles & Authorization          | ✅ COMPLETE | Centralized RBAC role constants, authorization policies, explicit endpoint access rules       |
| 4.7 Swagger & API Documentation    | ✅ COMPLETE | OpenAPI 3.1, Swagger UI, Bearer auth, DTO/errors/examples and CI contract generation          |

Следующий этап:

```txt
Этап 5. Projects Module
```

---

## Структура монорепозитория

```txt
Rew/
├── apps/
│   ├── api/      # NestJS Backend API
│   ├── web/      # React пользовательское приложение
│   ├── admin/    # React административная панель
│   └── worker/   # NestJS/BullMQ background worker
│
├── packages/
│   ├── config/   # общие константы, env, config contracts, utils, logging/errors
│   ├── types/    # общие TypeScript-типы, interfaces, enums
│   ├── sdk/      # единый Axios SDK для Backend API
│   └── ui/       # общий React UI Kit, hooks и theme tokens
│
├── infrastructure/
│   ├── docker/   # Docker Compose infrastructure config
│   └── helm/     # future Helm charts
│
├── docs/
│   ├── architecture/
│   ├── development/
│   └── implementation/
│
├── .github/workflows/
├── docker-compose.yml
├── package.json
├── yarn.lock
└── README.md
```

---

## Требования

- Node.js `24.x` LTS.
- Yarn Classic `1.22.22`.
- Docker + Docker Compose v2.
- Git.

Проверка локального окружения:

```bash
node --version
yarn --version
docker compose version
```

---

## Быстрый старт

```bash
yarn install --immutable --non-interactive

docker compose up -d

yarn build:packages

yarn dev
```

После запуска:

```txt
API:      http://localhost:3000/api/v1
Swagger:  http://localhost:3000/api/v1/docs
Web:      http://localhost:5173
Admin:    http://localhost:5174
MinIO UI: http://localhost:9001
```

---

## Основные команды

```bash
yarn workspace:list

yarn dev

yarn lint
yarn typecheck
yarn test
yarn build

yarn format
yarn format:check --ignore-unknown
yarn clean

yarn docs:api

yarn test:stage2
yarn test:stage3
yarn test:stage4
yarn test:e2e
```

Групповые команды:

```bash
yarn build:packages
yarn build:apps

yarn lint:packages
yarn lint:apps

yarn typecheck:packages
yarn typecheck:apps

yarn test:packages
yarn test:apps
```

Запуск отдельных приложений:

```bash
yarn dev:api
yarn dev:web
yarn dev:admin
yarn dev:worker
```

или напрямую:

```bash
yarn workspace @reviewsha/api dev
yarn workspace @reviewsha/web dev
yarn workspace @reviewsha/admin dev
yarn workspace @reviewsha/worker dev
```

---

## Приложения

### `apps/api`

Backend API на NestJS 11.

Сейчас содержит:

- bootstrap приложения;
- global prefix `/api/v1`;
- Swagger UI `/api/v1/docs`;
- OpenAPI JSON `/api/v1/docs-json`;
- Zod env validation;
- Prisma bootstrap;
- `DatabaseModule` + `PrismaService`;
- `RepositoriesModule` и Repository Layer;
- PostgreSQL health check;
- `HealthModule`;
- normalized `HttpExceptionFilter`;
- shared API logger.

Проверка:

```bash
yarn workspace @reviewsha/api dev
curl http://localhost:3000/api/v1/health
```

Ожидаемый ответ:

```json
{
  "status": "ok"
}
```

### `apps/web`

Пользовательское React 19 + Vite приложение.

Сейчас содержит:

- React Router;
- TanStack Query;
- Zustand;
- React Hook Form;
- Zod;
- Axios SDK layer через `@reviewsha/sdk`;
- `AppLayout`;
- `AuthLayout`;
- placeholder pages;
- env validation;
- ErrorBoundary;
- Vite alias `@`.

### `apps/admin`

Отдельное административное React 19 + Vite приложение.

Сейчас содержит:

- собственный router;
- admin pages;
- admin layouts;
- SDK API layer;
- env validation;
- ErrorBoundary;
- Vite alias `@`.

### `apps/worker`

Standalone NestJS Worker без HTTP API.

Сейчас содержит:

- Nest application context;
- BullMQ queue layer;
- Redis connection bootstrap;
- queues: `scan.queue`, `file.queue`, `ai.queue`, `report.queue`, `notification.queue`;
- worker classes для каждой очереди;
- graceful shutdown;
- shared worker logger;
- skeleton mode без Redis для локального запуска.

---

## Shared packages

Общий код хранится только в `packages/*` и подключается через workspace dependencies.

### `@reviewsha/config`

Содержит:

- API constants;
- env keys;
- URLs;
- queue names;
- bucket names;
- JWT constants;
- pagination defaults;
- upload/file limits;
- roles;
- permissions;
- typed config contracts;
- shared logger format;
- normalized error contracts;
- date/uuid/file/retry/validation utils.

### `@reviewsha/types`

Содержит общие типы без бизнес-логики:

- `User`;
- `Project`;
- `Scan`;
- `Report`;
- `File`;
- `QueueJob`;
- API response types;
- enums;
- utility types.

### `@reviewsha/sdk`

Единый API SDK на Axios:

- `ApiClient`;
- Authorization header support;
- `AuthAPI`;
- `ProjectsAPI`;
- `UploadsAPI`;
- `ReportsAPI`;
- `ChatAPI`;
- `AdminAPI`;
- `createReviewshaSDK`.

Frontend не должен вручную собирать HTTP-запросы в обход SDK.

### `@reviewsha/ui`

Общий UI Kit:

- Button;
- Input;
- Textarea;
- Select;
- Modal;
- Dialog;
- Card;
- Badge;
- Spinner;
- Loader;
- Avatar;
- Tooltip;
- Table;
- Pagination;
- EmptyState;
- hooks;
- theme tokens.

---

## Docker Compose infrastructure

Локальная инфраструктура запускается через Docker Compose. Приложения `api`, `web`, `admin` и `worker` на этом этапе не контейнеризируются и продолжают запускаться через Yarn.

### Сервисы

| Service    | Container                        | Port        | Назначение                   |
| ---------- | -------------------------------- | ----------- | ---------------------------- |
| PostgreSQL | `reviewsha-postgres`             | `5432`      | основная реляционная БД      |
| Redis      | `reviewsha-redis`                | `6379`      | очереди BullMQ и cache       |
| MinIO      | `reviewsha-minio`                | `9000/9001` | S3-compatible object storage |
| MinIO init | `reviewsha-minio-create-buckets` | —           | создание buckets для MVP     |

### Команды

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=100
docker compose down
```

Остановка с удалением volumes:

```bash
docker compose down -v
```

### Проверка инфраструктуры

```bash
docker compose exec -T postgres pg_isready -U reviewsha -d reviewsha
docker compose exec -T postgres psql -U reviewsha -d reviewsha -c "SELECT 1;"

docker compose exec -T redis redis-cli ping

docker compose exec -T minio mc ready local
docker compose exec -T minio mc alias set reviewsha-local http://localhost:9000 reviewsha reviewsha-password
docker compose exec -T minio mc ls reviewsha-local
```

Ожидаемые результаты:

```txt
PostgreSQL: accepting connections
Redis:      PONG
MinIO:      ready
Buckets:    projects, reports, temp, exports, avatars
```

### ENV Docker

Пример:

```txt
infrastructure/docker/.env.example
```

Для переопределения значений при запуске из корня можно создать `.env` в корне проекта.

Connection strings для локальных приложений:

```env
DATABASE_URL=postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=reviewsha
MINIO_SECRET_KEY=reviewsha-password
```

---

## Prisma и база данных

Prisma находится в `apps/api/prisma` и является источником схемы PostgreSQL для доменных данных MVP.

Структура:

```txt
apps/api/prisma/
├── schema.prisma
├── migrations/
├── seed.ts
└── seeds/
```

Основные команды:

```bash
docker compose up -d postgres

yarn workspace @reviewsha/api prisma:format
yarn workspace @reviewsha/api prisma:validate
yarn workspace @reviewsha/api prisma:generate
yarn workspace @reviewsha/api prisma:migrate
yarn workspace @reviewsha/api prisma:deploy
yarn workspace @reviewsha/api prisma:reset
yarn workspace @reviewsha/api prisma:studio
yarn workspace @reviewsha/api prisma:seed

yarn test:stage3
```

`yarn workspace @reviewsha/api test` сейчас покрывает API infrastructure, PrismaService и Repository Layer unit-тестами. `yarn test:stage3` проверяет schema/migrations/seed/PrismaService на реальной PostgreSQL test database.

`seed.ts` является тонким bootstrap-файлом. Данные разнесены по модулям `apps/api/prisma/seeds/*` и полностью детерминированы.

Схема реализует архитектурные сущности из `docs/architecture/04-database.md` и добавляет технические таблицы `refresh_tokens` и `queue_jobs` для auth/session management и аудита BullMQ jobs.

---

## Заполнение базы данных

Seed предназначен для локальной разработки, автоматических проверок, демо и будущих E2E-сценариев.

Структура seed-модулей:

```txt
apps/api/prisma/
├── seed.ts
└── seeds/
    ├── users.seed.ts
    ├── projects.seed.ts
    ├── uploads.seed.ts
    ├── scans.seed.ts
    ├── reports.seed.ts
    ├── findings.seed.ts
    ├── chats.seed.ts
    ├── queue-jobs.seed.ts
    ├── constants.ts
    ├── types.ts
    └── index.ts
```

Запуск:

```bash
yarn workspace @reviewsha/api prisma:seed
```

Полный reset локальной/test базы с повторным заполнением:

```bash
yarn workspace @reviewsha/api prisma:reset
```

Демонстрационные пользователи:

| Email                       | Роль  | Назначение                    |
| --------------------------- | ----- | ----------------------------- |
| `admin@reviewsha.local`     | ADMIN | администрирование             |
| `developer@reviewsha.local` | USER  | разработчик и владелец API    |
| `demo@reviewsha.local`      | USER  | демонстрационный пользователь |

Демонстрационные проекты:

- `NestJS API`;
- `React Dashboard`;
- `Linux Scripts`.

Seed создаёт связанные `UploadedFile`, `Scan`, `ScanStep`, `Report`, несколько десятков `Finding`, `AIRequest`, `ChatSession`, `ChatMessage` и `QueueJob` со статусами `WAITING`, `ACTIVE`, `COMPLETED`, `FAILED`.

Повторный запуск безопасен: все критичные записи создаются через `upsert` и стабильные deterministic IDs / unique keys.

---

## Работа с миграциями

Все изменения структуры PostgreSQL выполняются только через Prisma Migrate. Ручные schema changes через SQL-клиент и `prisma db push` запрещены для production и не используются в рабочем процессе проекта.

### Naming convention

Названия миграций должны быть осмысленными:

```txt
initial_schema
add_refresh_tokens
add_ai_chat
add_report_score
rename_scan_status
add_indexes
```

Не использовать:

```txt
migration1
fix
update
test
```

### Development workflow

```txt
Изменить apps/api/prisma/schema.prisma
↓
yarn workspace @reviewsha/api prisma:format
↓
yarn workspace @reviewsha/api prisma:validate
↓
yarn workspace @reviewsha/api prisma:migrate
↓
yarn workspace @reviewsha/api prisma:generate
↓
обновить apps/api/prisma/seed.ts при необходимости
↓
обновить docs/architecture/04-database.md и database.drawio при изменении структуры
↓
yarn test:stage3
↓
commit
```

Уже применённые миграции не редактируются. Если нужно изменить схему после merge, создаётся новая миграция.

### Production workflow

В production используется только:

```bash
yarn workspace @reviewsha/api prisma:deploy
```

### Reset локальной базы

```bash
yarn workspace @reviewsha/api prisma:reset
```

Команда выполняет `prisma migrate reset --force`, затем `prisma db seed`, поэтому после сброса база восстанавливает структуру и минимальные dev-данные. Использовать только для локальных/test баз.

### Prisma Studio

```bash
yarn workspace @reviewsha/api prisma:studio
```

Studio используется только для визуальной проверки данных в dev-окружении.

---

## Аутентификация

`apps/api/src/modules/auth` реализует JWT-аутентификацию с Access Token и Refresh Token. JWT-инфраструктура централизована в `TokenService`, а конфигурация вынесена в `apps/api/src/config/jwt.config.ts`.

Endpoints под `/api/v1`:

```txt
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/logout-all
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
```

Реализовано:

- Argon2 hashing для паролей;
- Access Token через `JWT_SECRET`;
- Refresh Token через `JWT_REFRESH_SECRET`;
- хранение Refresh Token только как SHA-256 hash в `refresh_tokens`;
- Refresh Token rotation;
- отзыв одного токена и всех токенов пользователя;
- единый `TokenService` для `generate`, `verify`, `decode` и hash Refresh Token;
- `JwtStrategy` и `RefreshStrategy`;
- `JwtAuthGuard`, `RefreshAuthGuard`, `RolesGuard`;
- Guards проверяют токены только через `TokenService`;
- decorators `@CurrentUser()`, `@Public()`, `@Roles()`;
- role checks для `ADMIN` и `USER`;
- Swagger Bearer Authorize.

ENV:

```env
JWT_SECRET=change-me-access
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change-me-refresh
JWT_REFRESH_EXPIRES_IN=30d
JWT_ISSUER=reviewsha-api
JWT_AUDIENCE=reviewsha-clients
JWT_ALGORITHM=HS256
```

В логах запрещены пароли, JWT и Refresh Token.

---

## Сессии и Refresh Token

`apps/api/src/modules/sessions` реализует управление пользовательскими сессиями поверх таблицы `refresh_tokens`.

Endpoints под `/api/v1`:

```txt
GET    /api/v1/sessions
DELETE /api/v1/sessions/:id
```

Реализовано:

- `SessionModule`;
- `SessionService` как единственная точка управления Refresh Token lifecycle;
- создание сессии после register/login;
- Argon2 hash Refresh Token перед сохранением;
- проверка сессии по JWT `jti`;
- refresh rotation;
- reuse detection с отзывом всех активных сессий пользователя;
- logout одной сессии;
- logout-all всех сессий;
- список активных сессий;
- отзыв выбранной сессии;
- cleanup expired sessions для будущего Worker;
- сохранение IP/User-Agent/browser/OS и activity update;
- лимит активных сессий через `MAX_SESSIONS_PER_USER`.

ENV:

```env
MAX_SESSIONS_PER_USER=10
```

AuthModule не обращается к `RefreshTokenRepository` напрямую — только через `SessionService`.

---

## Guards и контроль доступа

Общая инфраструктура защиты API находится в:

```txt
apps/api/src/common/auth
```

Реализовано:

- `JwtAuthGuard`;
- `RefreshAuthGuard`;
- `RolesGuard`;
- `OwnershipGuard`;
- `ApiKeyGuard`;
- `@Public()`;
- `@CurrentUser()`;
- `@Roles()`;
- `@Ownership()`.

`JwtAuthGuard` подключён глобально через `APP_GUARD`: все endpoints приватные по умолчанию. Публичные endpoints явно отмечаются `@Public()`.

`INTERNAL_API_KEY` используется `ApiKeyGuard` для будущих внутренних интеграций, worker/webhooks/CLI.

---

## Roles & Authorization

Централизованная RBAC-инфраструктура находится в:

```txt
apps/api/src/common/authorization
```

Используется:

- `APP_ROLES` — единые role constants;
- `AUTHORIZATION_POLICIES` — правила доступа;
- `FUTURE_PERMISSIONS` — подготовка к permission-based access;
- `ownershipRequired` metadata — подготовка к owner override.

Правило проекта: каждый endpoint должен быть явно отмечен `@Public()` или `@Roles(...)`.

---

## Users Module

`apps/api/src/modules/users` реализует первый доменный Backend-модуль. Он не отвечает за авторизацию и не выдаёт токены — это зона будущего `AuthModule`.

Endpoints под глобальным prefix `/api/v1`:

```txt
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id
```

Поддерживается:

- DTO validation через `class-validator` / `class-transformer`;
- Swagger-документация всех endpoints;
- пагинация `page` / `limit`;
- поиск по `email` и `displayName`;
- сортировка по `createdAt`, `displayName`, `email`;
- ответы без `passwordHash`;
- логирование create/update/delete без паролей;
- доступ к данным только через `UserRepository`.

---

## Prisma Client и Repository Layer

Backend использует единый `PrismaService` из `apps/api/src/database/prisma.service.ts`. Он создаётся через NestJS DI, подключается в lifecycle `onModuleInit`, закрывает соединение в `onModuleDestroy` и предоставляет `healthCheck()` для `/api/v1/health`.

Все обращения доменной логики к PostgreSQL должны идти через Repository Layer:

```txt
apps/api/src/repositories/
├── base
├── user
├── project
├── upload
├── scan
├── report
├── finding
├── auth
├── queue
└── chat
```

Правило проекта: **не создавать `new PrismaClient()` и не вызывать `prisma.<model>.*` в доменных сервисах**. Исключения: `PrismaService` и CLI seed bootstrap в `apps/api/prisma/**`.

Репозитории имеют интерфейсы, принимают `RepositoryOptions.tx` для транзакций и не содержат HTTP/business exceptions.

---

## ENV и конфигурация

Файлы примеров окружения:

```txt
.env.example
apps/api/.env.example
apps/worker/.env.example
apps/web/.env.example
apps/admin/.env.example
infrastructure/docker/.env.example
```

Правила проекта:

- каждое приложение имеет собственный `.env.example`;
- backend/worker env читается только config layer;
- frontend env читается только frontend config layer;
- env validation выполняется через Zod;
- общие env keys и defaults находятся в `@reviewsha/config`.

---

## Logging и Error Handling

Единый формат логов:

```txt
[Timestamp] Service Level Context Message
```

Пример:

```txt
[2026-08-01T18:24:15.000Z] API INFO AuthService User created
```

Единые error contracts находятся в `@reviewsha/config`:

- `ErrorResponseBody` для Backend;
- `WorkerErrorBody` для Worker;
- `FrontendErrorBody` для Frontend.

Frontend-приложения используют ErrorBoundary.

---

## TypeScript aliases и imports

Shared packages:

```ts
import { Button } from '@reviewsha/ui';
import type { Project } from '@reviewsha/types';
import { QUEUE_NAMES } from '@reviewsha/config';
import { createReviewshaSDK } from '@reviewsha/sdk';
```

App aliases:

```ts
import { apiClient } from '@/api/client';
import { ErrorBoundary } from '@/common/errors/ErrorBoundary';
```

Запрещено импортировать общий код через относительные пути между приложениями.

Подробные правила:

```txt
docs/development/standards.md
```

---

## Git hooks и качество кода

Настроено:

```txt
.husky/pre-commit
lint-staged
```

Перед commit выполняется:

```bash
yarn lint-staged
yarn typecheck
yarn format:check --ignore-unknown
```

Проверить hook вручную:

```bash
yarn hooks:pre-commit
```

---

## IDE support

VS Code:

```txt
.vscode/extensions.json
.vscode/settings.json
```

Рекомендовано:

- ESLint;
- Prettier;
- Prisma extension;
- Docker extension;
- Vitest extension.

JetBrains IDE:

- использовать TypeScript из `node_modules`;
- включить Prettier как formatter;
- включить ESLint flat config;
- использовать Node.js 24.x.

---

## Stage 4 completion notes

Stage 4 covers Users, JWT/Auth, Sessions, Guards, Roles and Swagger/OpenAPI. The next implementation track starts with the domain modules, beginning with **Stage 5 — Projects Module**.

Key finalized decisions:

- user deletion is implemented as soft delete through `deletedAt` + `isActive=false`;
- Sessions module exposes an explicit `SessionRepository` alias over `RefreshTokenRepository`, because sessions are stored in `refresh_tokens`;
- JWT defaults to `HS256`, while config types allow future `RS256`/`ES256` migration;
- current-user profile updates are exposed through `PATCH /api/v1/auth/me`;
- critical Stage 4 backend logic is checked by `yarn test:stage4` with coverage thresholds.

---

## Swagger & OpenAPI

Backend API documentation is available after starting `apps/api`:

```txt
http://localhost:3000/api/v1/docs
http://localhost:3000/api/v1/docs-json
```

OpenAPI can be generated locally without starting an HTTP server:

```bash
yarn docs:openapi
```

Swagger uses OpenAPI `3.1.0`, stable operation IDs for SDK generation, DTO schemas, normalized error models and JWT Bearer authentication. Protected endpoints show the **Authorize** flow; public endpoints stay unauthenticated.

---

## Git workflow

Используем две постоянные ветки:

```txt
main  — стабильная ветка, только проверенные изменения;
dev   — интеграционная ветка для текущей разработки.
```

Правило работы:

```txt
feature/* → dev → main
```

Перед push обязательно локально прогонять единый профиль, соответствующий всем проверкам CI. Это заменяет ручной запуск отдельных тестовых наборов по одному:

```bash
yarn ci:local
```

Для быстрых локальных проверок можно запускать отдельные профили:

```bash
yarn ci:quality
yarn ci:build
yarn ci:openapi
yarn ci:unit
yarn ci:smoke
yarn ci:prisma
yarn ci:stage4
yarn ci:e2e
yarn ci:docker
```

---

## CI/CD

Проект использует GitHub Actions, потому что исходный код находится на GitHub. CI декомпозирован на параллельные jobs: lint, typecheck, format-check, build/docs, openapi-docs, unit-tests, smoke-tests, prisma-tests, stage4-tests, e2e-tests и docker-config.

Workflows:

```txt
.github/workflows/ci.yml
.github/workflows/release.yml
```

CI запускается при:

- push в `main`;
- pull request;
- ручном запуске через `workflow_dispatch`.

Pull Request считается готовым к merge только после успешного прохождения:

```bash
yarn install --immutable --non-interactive
yarn lint
yarn typecheck
yarn format:check --ignore-unknown
yarn build
yarn docs:api
yarn docs:openapi
yarn test
yarn test:stage2
yarn test:stage3
yarn test:stage4
yarn test:e2e
docker compose config
```

CI использует:

- Node.js LTS `24.x`;
- Corepack;
- Yarn Classic `1.22.22`;
- cache по `yarn.lock`;
- artifact upload временно отключён, чтобы не получать предупреждения GitHub Actions о deprecated Node runtime в upload-artifact.

Подготовлены placeholder steps для будущих проверок:

- Docker image build;
- dependency audit;
- license checks;
- secret scanning.

Логика CI совместима с будущим переносом в GitLab CI:

```txt
Install → Lint → Typecheck → Build → Test → Docker → Deploy
```

---

## Тесты

Текущее покрытие инфраструктурного skeleton:

```txt
packages/config: 2 files, 11 tests
packages/types:  1 file, 4 tests
packages/sdk:    1 file, 3 tests
packages/ui:     2 files, 12 tests
apps/api:        8 files, 19 tests
apps/web:        8 files, 23 tests
apps/admin:      11 files, 44 tests
apps/worker:     11 files, 36 tests
```

Итого:

```txt
47 unit/infrastructure test files + 2 Playwright E2E tests
176 unit/infrastructure/stage tests + 2 E2E tests
```

Организация тестов:

```txt
apps/<app>/tests/unit/**       # unit/infrastructure tests приложений
packages/<pkg>/tests/unit/**   # unit tests shared packages
tests/stage2/**                # smoke + integration acceptance tests этапа 2
tests/stage3/**                # Prisma schema/migration/seed acceptance tests этапов 3.1–3.3
tests/e2e/**                   # Playwright E2E
```

Unit-тесты не хранятся внутри `src`, чтобы production-код и проверочная инфраструктура не смешивались.

Запуск:

```bash
yarn test
yarn test:stage2
yarn test:stage3
yarn test:stage4
yarn test:e2e
```

---

## Документация

Основные документы:

```txt
docs/PRD.md
docs/architecture/*
docs/development/standards.md
docs/implementation/stage-2.md
docs/implementation/stage-2-2-definition-of-done.md
docs/implementation/stage-2-3-shared-packages.md
docs/implementation/stage-2-4-docker-compose.md
docs/implementation/stage-2-5-basic-infrastructure.md
docs/implementation/stage-2-6-ci-cd.md
docs/implementation/stage-2-final-audit.md
docs/implementation/stage-3-1-prisma-schema.md
docs/implementation/stage-3-2-migrations.md
docs/implementation/stage-3-3-seed.md
docs/generated/api/            # генерируется командой yarn docs:api и не коммитится
```

API-документация shared packages генерируется из TSDoc/docstrings через TypeDoc:

```bash
yarn docs:api
```

---

## Правило разработки

Любая новая фича должна обновлять не только код, но и всё, что она затрагивает:

- тесты;
- документацию;
- README;
- TSDoc/docstrings для публичных API, если меняется exported surface;
- CI/CD;
- env examples;
- shared packages;
- архитектурные документы при изменении архитектуры.
