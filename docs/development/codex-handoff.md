# Codex Handoff — Reviewsha

Этот файл — карта проекта для следующего Codex/агента. Его нужно прочитать перед началом любой новой задачи. Он описывает структуру, правила работы, порядок проверок и известные особенности проекта.

## 1. Текущее состояние

- Репозиторий: `https://github.com/oxxxxxxy/reviewsha.git`.
- Основная ветка: `main`.
- Рабочая ветка разработки: `dev`.
- На момент создания файла `main` и `dev` синхронизированы.
- Последний коммит: `200796b fix(api): align user password hashing with auth`.
- Рабочее дерево должно оставаться чистым после завершения задачи.
- Docker Compose и локальные сервисы сейчас остановлены.
- Следующий запланированный этап: **Этап 5 — Projects Module**.

Этапы 1–4.7 считаются завершёнными. Перед изменением уже реализованного кода нужно сверяться с соответствующим acceptance-документом и архитектурой, а не считать README единственным источником истины.

## 2. Что читать и в каком порядке

1. `README.md` — быстрый старт, статус этапов, команды и карта репозитория.
2. `docs/PRD.md` — продуктовые требования и MVP-границы.
3. `docs/architecture/00-principles.md` — обязательные архитектурные принципы.
4. `docs/architecture/01-overview.md` — общая система и границы сервисов.
5. `docs/architecture/02-monorepo.md` — workspace и зависимости.
6. `docs/architecture/03-backend.md` — NestJS-слои, DI, modules, repositories.
7. `docs/architecture/04-database.md` — доменные модели, связи и ограничения БД.
8. `docs/architecture/05-auth.md` — authentication/session/security contract.
9. `docs/architecture/10-frontend.md` — web/admin/frontend rules.
10. `docs/architecture/11-api-contracts.md` — API path, response/error contract.
11. `docs/architecture/07-queues.md` и `08-worker.md` — очереди и Worker.
12. `docs/development/standards.md` — code style, imports, tests, naming.
13. `docs/implementation/stage-4-1-*` … `stage-4-7-*` — фактические acceptance и implementation notes.
14. Acceptance-документ текущего этапа — обязательный список результата.

После каждой фичи синхронно обновлять код, тесты, README, implementation docs, архитектурные документы, OpenAPI и CI, если они затронуты.

## 3. Структура монорепозитория

```text
apps/
  api/       NestJS 11 API, Prisma, Swagger, auth and domain modules
  web/       React 19 + Vite user frontend
  admin/     React 19 + Vite admin frontend
  worker/    NestJS application context, BullMQ and Redis workers

packages/
  config/    shared constants, env contracts, URLs, queues, buckets, utils
  types/     shared TypeScript interfaces and enums
  sdk/       shared Axios API SDK
  ui/        shared React UI kit, theme and hooks

docs/
  architecture/   system contracts and diagrams
  development/    development standards and this handoff
  implementation/ stage-by-stage acceptance and implementation notes

tests/
  stage2/          repository/application smoke and integration checks
  stage3/          Prisma, migrations, seed and PostgreSQL integration
  e2e/             Playwright web/admin smoke tests

.github/workflows/ci.yml   decomposed GitHub Actions pipeline
docker-compose.yml         local PostgreSQL, Redis and MinIO infrastructure
```

Workspace packages подключаются через Yarn workspace dependencies. Общий код не копировать в `apps/*` и не импортировать между приложениями относительными путями.

## 4. Backend API: где что лежит

### Bootstrap и конфигурация

- `apps/api/src/main.ts` — bootstrap Nest, prefix `/api/v1`, CORS, pipes, exception filter, Swagger and shutdown.
- `apps/api/src/app.module.ts` — composition root, global modules and guards.
- `apps/api/src/config/` — typed configuration and env validation.
- `apps/api/src/database/prisma.service.ts` — единственный Prisma Client, подключение, disconnect, logging and health query.
- `apps/api/src/database/database.module.ts` — global `DatabaseModule`.
- `apps/api/src/health/` — health endpoint and PostgreSQL health check.

### Repository Layer

- `apps/api/src/repositories/base/` — base repository and transaction options.
- `apps/api/src/repositories/user/`
- `apps/api/src/repositories/project/`
- `apps/api/src/repositories/scan/`
- `apps/api/src/repositories/report/`
- `apps/api/src/repositories/finding/`
- `apps/api/src/repositories/upload/`
- `apps/api/src/repositories/auth/refresh-token.repository.ts`
- `apps/api/src/repositories/queue/`
- `apps/api/src/repositories/chat/`

Доменные services не обращаются к Prisma напрямую. Любая новая операция БД добавляется в repository с интерфейсом и unit-тестом.

### Users

`apps/api/src/modules/users/` содержит controller, service, DTO, mapper, validation and module. Users CRUD доступен только административным ролям. Профиль текущего пользователя обновляется через `PATCH /api/v1/auth/me`. `UserRepository.delete()` — soft delete (`deletedAt` и `isActive=false`), не hard delete.

### Auth and sessions

- `apps/api/src/modules/auth/` — register/login/logout/refresh/me, strategies, DTO and `TokenService`.
- `apps/api/src/modules/sessions/` — `SessionService`, session controller, `SessionRepository`, rotation, revocation, reuse detection, device data, activity and cleanup.
- `apps/api/src/common/auth/` — JWT/refresh guards, decorators, types and constants.
- `apps/api/src/common/authorization/` — centralized roles, policies and permission-ready contracts.

Пароли и refresh token hashes используют **Argon2**. JWT access/refresh подписываются через `TokenService`; сервисы не должны вызывать `JwtService.sign` напрямую. Текущая конфигурация поддерживает `HS256`, типы подготовлены для `RS256`/`ES256`; секреты никогда не коммитить.

### API paths

- Base prefix: `/api/v1`.
- Health: `GET /api/v1/health`.
- Swagger UI: `/api/v1/docs`.
- OpenAPI JSON: `/api/v1/docs-json`.
- Auth: `/api/v1/auth/register`, `/login`, `/logout`, `/logout-all`, `/refresh`, `/me` (`GET` и `PATCH`).
- Sessions: `/api/v1/sessions` and `/api/v1/sessions/:id`.
- Users: `/api/v1/users` and `/api/v1/users/:id`.

Проверять API contract по `docs/architecture/11-api-contracts.md` и `docs/generated/openapi.json`, а не придумывать новый prefix или response shape.

## 5. Prisma и база данных

- Schema: `apps/api/prisma/schema.prisma`.
- Migrations: `apps/api/prisma/migrations/`.
- Seed entrypoint: `apps/api/prisma/seed.ts`.
- Seed modules: `apps/api/prisma/seeds/`.
- Prisma config: `apps/api/prisma.config.ts`.
- Database URL: `DATABASE_URL`.

Основные модели: `User`, `RefreshToken`, `Project`, `UploadedFile`, `Scan`, `Report`, `Finding`, `ChatSession`, `ChatMessage`, `QueueJob`. Сначала меняется schema, затем `prisma format`, `validate`, новая migration, seed и тесты. Уже применённые migration-файлы не редактировать.

Команды API:

```bash
yarn workspace @reviewsha/api prisma:format
yarn workspace @reviewsha/api prisma:validate
yarn workspace @reviewsha/api prisma:generate
yarn workspace @reviewsha/api prisma:migrate
yarn workspace @reviewsha/api prisma:deploy
yarn workspace @reviewsha/api prisma:reset
yarn workspace @reviewsha/api prisma:seed
yarn workspace @reviewsha/api prisma:studio
```

Для локальной БД:

```bash
docker compose up -d postgres redis minio
docker compose down
```

## 6. Общие контракты и инфраструктура

### `@reviewsha/config`

Смотри `packages/config/src/index.ts` и подпапки `constants`, `env`, `queues`, `urls`, `validation`, `utils`. Архитектурные queue names:

```text
scan.queue
file.queue
ai.queue
report.queue
notification.queue
```

Storage buckets из архитектуры:

```text
projects
reports
temp
exports
avatars
```

### `@reviewsha/types`

Смотри `packages/types/src/`. Общие модели, enum и API contracts должны жить только здесь.

### `@reviewsha/sdk`

Смотри `packages/sdk/src/`. Frontend и admin используют SDK, а не собственные Axios-запросы. При изменении endpoint сначала обновить API contract и SDK.

### `@reviewsha/ui`

Смотри `packages/ui/src/`. Общие компоненты, layouts, theme tokens and hooks используются web/admin одновременно.

## 7. Worker и Docker

`apps/worker/src/main.ts` запускает Nest application context без HTTP-сервера. Очереди и worker classes находятся в `apps/worker/src/queue/` и `apps/worker/src/workers/`. Worker должен корректно закрываться по SIGINT/SIGTERM.

`docker-compose.yml` поднимает только инфраструктуру, не приложения:

- PostgreSQL — persistent named volume `postgres_data`;
- Redis — BullMQ backend;
- MinIO — API/Console and architecture buckets.

## 8. Тесты

Тесты должны быть отделены от production-кода: unit/integration tests лежат в `apps/*/tests`, общие smoke/stage tests — в корневом `tests/`.

Минимальные команды:

```bash
yarn test                 # package + app unit/integration tests
yarn test:stage2          # Stage 2 smoke/integration
yarn test:stage3          # Prisma/migrations/seed/PostgreSQL
yarn test:stage4          # auth API tests + coverage thresholds
yarn test:e2e             # Playwright web/admin
```

Для новой фичи добавлять тесты одновременно с кодом: happy path, validation, ошибки, security/permissions, integration boundary and regression case. Не увеличивать один монолитный тест; разбивать по module/layer/category.

## 9. CI и локальная проверка

Основной workflow: `.github/workflows/ci.yml`. Он запускается на push в `main` и `dev`, pull request в эти ветки, вручную и nightly. Jobs разделены:

- lint;
- typecheck;
- format-check;
- build/docs;
- OpenAPI contract;
- unit tests;
- Stage 2 smoke;
- Stage 3 Prisma;
- Stage 4 auth/coverage;
- Playwright E2E;
- Docker Compose config;
- aggregate result.

До push запускать:

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
yarn ci:docker
```

Или использовать полный локальный pipeline:

```bash
yarn ci:local
```

`ci:local` может занять заметное время и требует Docker для Stage 3/E2E. После тестов остановить инфраструктуру командой `docker compose down`, если она больше не нужна.

## 10. Git workflow

1. Прочитать этот handoff, README, PRD, архитектуру и acceptance текущего этапа.
2. Проверить `git status` и текущую ветку.
3. Делать небольшие логические изменения, не смешивать unrelated refactor.
4. Добавить/обновить tests, docs, README, OpenAPI и CI для всех затронутых частей.
5. Локально выполнить проверки, особенно те, которые запускаются GitHub Actions.
6. Создать понятный Conventional Commit, например: `feat(api): implement projects module`.
7. Запушить изменения в `main` и синхронизировать `dev`, если это текущая принятая политика репозитория.
8. Проверить чистое рабочее дерево и сообщить commit, ветки и результаты тестов.

Не коммитить `.env`, секреты, `node_modules`, `dist`, coverage artifacts или временные файлы. Перед новым этапом проверить, что README и таблица статусов не остались на старом пункте.

## 11. Известные ловушки

- API использует `/api/v1`, не `/api`.
- Queue names и bucket names должны соответствовать архитектуре, даже если старые acceptance-тексты содержат другие варианты.
- `PrismaClient` создаётся только в `PrismaService`.
- Services не используют Prisma напрямую; доступ только через repositories.
- `SessionRepository` должен иметь явный constructor с `PrismaService`, потому что он наследуется от `RefreshTokenRepository`.
- Users CRUD должен хранить пароль в Argon2 hash, иначе созданный через `POST /users` пользователь не сможет пройти Argon2 login.
- OpenAPI generator создаёт приложение Nest без HTTP listen; новые providers с неоднозначными reflected dependencies нужно регистрировать явно через `@Inject(...)`, если это требуется runtime DI.
- Stage 3 tests поднимают отдельные PostgreSQL databases. При зависшем или оборванном прогоне проверить процессы и Docker-контейнеры, затем повторить тесты на чистой инфраструктуре.
- Не оставлять dev servers, Vitest, Prisma, Docker Compose и другие фоновые процессы после окончания работы, если они не нужны.

## 12. Как продолжать работу

Следующий этап — Projects Module. Перед реализацией нужно прочитать PRD, `docs/architecture/03-backend.md`, `04-database.md`, `11-api-contracts.md`, соответствующие sequence diagrams, acceptance-документ нового этапа и текущие repositories/types/SDK. Сначала согласовать модель и API contract с docs, затем реализовывать Controller → Service → Repository, после чего добавить unit/integration/E2E tests, Swagger, README, architecture/implementation docs и CI checks.
