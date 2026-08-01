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

Следующий этап:

```txt
Этап 3.2 Database Layer + Domain Foundation
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
- global prefix `/api`;
- Swagger UI `/api/v1/docs`;
- OpenAPI JSON `/api/v1/docs-json`;
- Zod env validation;
- Prisma bootstrap;
- `DatabaseModule`;
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
└── seed.ts
```

Основные команды:

```bash
docker compose up -d postgres

yarn workspace @reviewsha/api prisma:format
yarn workspace @reviewsha/api prisma:validate
yarn workspace @reviewsha/api prisma:generate
yarn workspace @reviewsha/api prisma:migrate
yarn workspace @reviewsha/api prisma:deploy
yarn workspace @reviewsha/api prisma:seed

yarn test:stage3
```

`seed.ts` идемпотентен и создаёт минимальные dev-данные: администратора, пользователя, организацию, приглашение, проект, участника проекта, файл, scan, scan step, report, finding, AI request, chat, message, notification и queue job.

Схема реализует архитектурные сущности из `docs/architecture/04-database.md` и добавляет технические таблицы `refresh_tokens` и `queue_jobs` для auth/session management и аудита BullMQ jobs.

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

## CI/CD

Проект использует GitHub Actions, потому что исходный код находится на GitHub.

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
yarn test
yarn test:stage2
yarn test:stage3
yarn test:e2e
docker compose config
```

CI использует:

- Node.js LTS `24.x`;
- Corepack;
- Yarn Classic `1.22.22`;
- cache по `yarn.lock`;
- build artifacts для `dist` директорий через `actions/upload-artifact@v5`.

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
167 unit/infrastructure/stage tests + 2 E2E tests
```

Организация тестов:

```txt
apps/<app>/tests/unit/**       # unit/infrastructure tests приложений
packages/<pkg>/tests/unit/**   # unit tests shared packages
tests/stage2/**                # smoke + integration acceptance tests этапа 2
tests/stage3/**                # Prisma schema/migration/seed acceptance tests этапа 3.1
tests/e2e/**                   # Playwright E2E
```

Unit-тесты не хранятся внутри `src`, чтобы production-код и проверочная инфраструктура не смешивались.

Запуск:

```bash
yarn test
yarn test:stage2
yarn test:stage3
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
