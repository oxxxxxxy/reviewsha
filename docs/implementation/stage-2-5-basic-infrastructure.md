# Этап 2.5. Базовая инфраструктура проекта — Definition of Done

> **Historical implementation note.** This document records an earlier plan or execution checkpoint. It is retained for traceability; current behavior is defined by code and the canonical docs index.

Статус: ✅ COMPLETE

## Цель

Подготовить единые стандарты разработки, конфигурации, логирования, обработки ошибок, импортов, IDE support и git hooks для всех приложений монорепозитория.

## ENV

Созданы и поддерживаются env examples:

```txt
.env.example
apps/api/.env.example
apps/worker/.env.example
apps/web/.env.example
apps/admin/.env.example
```

Правила:

- backend/worker env читается только config layer;
- frontend env читается только frontend config layer;
- validation выполняется через Zod;
- общий список env keys хранится в `@reviewsha/config`.

## Configuration

В `packages/config` добавлены типизированные секции:

```txt
Application
Database
Redis
MinIO
JWT
AI
Queue
Storage
```

Файл:

```txt
packages/config/src/configuration/app.configuration.ts
```

## Logging

Добавлен единый shared formatter:

```txt
packages/config/src/logger/log-format.ts
```

Формат:

```txt
[Timestamp] Service Level Context Message
```

Пример:

```txt
[2026-08-01T18:24:15.000Z] API INFO AuthService User created
```

Используется в:

```txt
apps/api/src/common/logger/api-logger.service.ts
apps/worker/src/common/logger/worker-logger.service.ts
```

## Error handling

Единые error contracts добавлены в:

```txt
packages/config/src/errors/error-format.ts
```

Backend:

- `HttpExceptionFilter` возвращает нормализованный `ErrorResponseBody`;
- response соответствует `docs/architecture/11-api-contracts.md`: `{ error: { code, message } }`.

Worker:

- подготовлен `WorkerErrorBody` для queue/job errors.

Frontend:

- добавлены Error Boundaries для `apps/web` и `apps/admin`;
- подготовлен `FrontendErrorBody`.

## Shared constants

В `packages/config` находятся:

- roles;
- permissions;
- queue names;
- bucket names;
- pagination;
- timeouts;
- file/upload limits;
- env keys.

## Utils

Добавлены shared utils:

```txt
packages/config/src/utils/date.helpers.ts
packages/config/src/utils/uuid.helpers.ts
packages/config/src/utils/file.helpers.ts
packages/config/src/utils/retry.helpers.ts
packages/config/src/utils/validation.helpers.ts
```

## Naming/import standards

Зафиксированы в:

```txt
docs/development/standards.md
```

Правила:

- shared code импортируется только через `@reviewsha/*`;
- локальный код приложений импортируется через alias `@` или короткие относительные импорты внутри одного слоя;
- запрещены относительные импорты общего кода между приложениями.

## Aliases

Настроены workspace aliases:

```txt
@reviewsha/ui
@reviewsha/sdk
@reviewsha/types
@reviewsha/config
```

Настроены app aliases:

```txt
@
@/components
@/features
@/hooks
@/api
@/config
@/common
```

## Git hooks

Добавлены:

```txt
.husky/pre-commit
lint-staged
```

Pre-commit выполняет:

```bash
yarn lint-staged
yarn typecheck
yarn format:check --ignore-unknown
```

## IDE

Добавлено:

```txt
.vscode/extensions.json
.vscode/settings.json
```

## Тесты

Добавлены и обновлены тесты для:

- shared config utils;
- shared log formatter;
- API logger;
- Worker logger;
- API exception filter;
- web env validation;
- admin env validation;
- web ErrorBoundary;
- admin ErrorBoundary.

## Проверки

Успешно выполняются:

```bash
yarn install
yarn lint
yarn typecheck
yarn test
yarn build
yarn format:check --ignore-unknown
yarn hooks:pre-commit
```

`yarn dev` проверяется smoke-run режимом запуска рабочих dev процессов с последующей остановкой.

## Definition of Done

- ✅ Для каждого приложения создан собственный `.env.example`.
- ✅ Конфигурации типизированы и валидируются.
- ✅ Реализован единый подход к логированию.
- ✅ Определён единый формат обработки ошибок для Backend, Worker и Frontend.
- ✅ Общие константы вынесены в `packages/config`.
- ✅ Подготовлены общие утилиты.
- ✅ Зафиксированы соглашения по именованию файлов, классов и сущностей.
- ✅ Настроены TypeScript aliases для приложений и shared packages.
- ✅ Запрещено дублирование общего кода между приложениями.
- ✅ Настроены Husky и `lint-staged`.
- ✅ Добавлены рекомендации для IDE.
- ✅ `README.md` обновлён.
- ✅ Инфраструктура готова к Этапу 3 — база данных.
