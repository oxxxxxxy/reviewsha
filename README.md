# Ревьюша

AI SaaS platform for automated code review.

## Текущее состояние

- ✅ Этап 1: проектирование системы — завершён.
- ✅ Этап 2.1: Yarn Workspaces — завершён.
- ✅ Этап 2.2: создание приложений — завершён (`api`, `web`, `admin`, `worker`).
- ✅ Этап 2.3: shared packages — завершён (`config`, `types`, `sdk`, `ui`).

## Структура монорепозитория

```txt
apps/
├── api      # NestJS Backend API
├── web      # React пользовательское приложение
├── admin    # React административная панель
└── worker   # NestJS/BullMQ background worker

packages/
├── config   # общие константы, URL, env keys, очереди, validation helpers
├── types    # общие TypeScript-типы, interfaces, enums, utility types
├── sdk      # единый Axios SDK для Backend API
└── ui       # общий React UI Kit, hooks и theme tokens
```

## Требования

- Node.js 24+
- Yarn Classic 1.22.22

## Быстрый старт

```bash
yarn install
```

Для приложений, которые используют shared packages, сначала собери пакеты:

```bash
yarn build:packages
```

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
```

## Команды по группам

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

## Запуск отдельных приложений

```bash
yarn workspace @reviewsha/api dev
yarn workspace @reviewsha/web dev
yarn workspace @reviewsha/admin dev
yarn workspace @reviewsha/worker dev
```

## Shared packages

Все приложения подключают общий код через workspace-зависимости вида `@reviewsha/*`.

```bash
yarn workspace @reviewsha/config build
yarn workspace @reviewsha/types build
yarn workspace @reviewsha/sdk build
yarn workspace @reviewsha/ui build
```

Правило проекта: общий код не копируется между приложениями. Общие типы, UI, SDK и конфигурация добавляются только в `packages/*`.

## CI

GitHub Actions workflow находится в `.github/workflows/ci.yml` и выполняет:

1. `yarn install --frozen-lockfile`
2. `yarn format:check --ignore-unknown`
3. `yarn lint`
4. `yarn typecheck`
5. `yarn test`
6. `yarn build`

## Документация

- `docs/PRD.md` — продуктовые требования.
- `docs/architecture/*` — архитектура системы.
- `docs/implementation/stage-2.md` — статус реализации Этапа 2.
- `docs/implementation/stage-2-2-definition-of-done.md` — DoD по созданию приложений.
- `docs/implementation/stage-2-3-shared-packages.md` — DoD по shared packages.

## Docker Compose infrastructure

Локальная инфраструктура запускается через Docker Compose. Приложения `api`, `web`, `admin` и `worker` на этом этапе не контейнеризируются и продолжают запускаться через Yarn.

### Сервисы

| Service    | Container                        | Port        | Назначение                   |
| ---------- | -------------------------------- | ----------- | ---------------------------- |
| PostgreSQL | `reviewsha-postgres`             | `5432`      | основная реляционная БД      |
| Redis      | `reviewsha-redis`                | `6379`      | очереди BullMQ и cache       |
| MinIO      | `reviewsha-minio`                | `9000/9001` | S3-compatible object storage |
| MinIO init | `reviewsha-minio-create-buckets` | —           | создание buckets для MVP     |

### Запуск

Из корня репозитория:

```bash
docker compose up -d
docker compose ps
docker compose logs
```

Остановка:

```bash
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
Buckets:    uploads, reports, artifacts
```

### Переменные окружения Docker

Пример находится здесь:

```txt
infrastructure/docker/.env.example
```

Для переопределения значений при запуске из корня можно создать `.env` в корне проекта на основе этого файла.

### Connection strings для локально запущенных приложений

```env
DATABASE_URL=postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=reviewsha
MINIO_SECRET_KEY=reviewsha-password
```

## Базовая инфраструктура разработки

Этап 2.5 фиксирует единые правила для всех приложений монорепозитория.

### ENV

Каждое приложение имеет собственный `.env.example`:

```txt
.env.example
apps/api/.env.example
apps/worker/.env.example
apps/web/.env.example
apps/admin/.env.example
```

Backend и Worker валидируют env через Zod в config layer. Frontend-приложения валидируют `VITE_*` переменные в собственном config layer.

### TypeScript aliases

Shared packages подключаются как workspace-пакеты:

```ts
import { Button } from '@reviewsha/ui';
import type { Project } from '@reviewsha/types';
import { QUEUE_NAMES } from '@reviewsha/config';
```

Для локального кода приложений настроен alias `@`:

```ts
import { apiClient } from '@/api/client';
import { ErrorBoundary } from '@/common/errors/ErrorBoundary';
```

### Logging и errors

Единый формат логов:

```txt
[Timestamp] Service Level Context Message
```

Общие типы error response, frontend error и worker error находятся в `@reviewsha/config`.

### Git hooks

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

### IDE

Рекомендации для VS Code находятся в:

```txt
.vscode/extensions.json
.vscode/settings.json
```

Проект также подходит для JetBrains IDE: использовать TypeScript из `node_modules`, Prettier как default formatter и ESLint flat config.

Подробные стандарты разработки:

```txt
docs/development/standards.md
docs/implementation/stage-2-5-basic-infrastructure.md
```
