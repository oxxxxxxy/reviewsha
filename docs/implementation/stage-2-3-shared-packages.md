# Этап 2.3. Shared Packages — Definition of Done

Статус: ✅ COMPLETE

## Цель

Создать единое место хранения общего кода проекта, чтобы приложения `api`, `web`, `admin` и `worker` подключали конфигурацию, типы, SDK и UI через workspace-пакеты без копирования файлов.

## Созданные пакеты

```txt
packages/
├── config
├── types
├── sdk
└── ui
```

Каждый пакет содержит:

```txt
package.json
tsconfig.json
tsconfig.build.json
README.md
src/index.ts
```

## packages/config

Содержит:

- API constants: `API_PREFIX`, `API_VERSION`, `DEFAULT_API_TIMEOUT_MS`;
- URL defaults: `DEFAULT_URLS.api`, `DEFAULT_URLS.web`, `DEFAULT_URLS.admin`, `DEFAULT_URLS.minio`, `DEFAULT_URLS.redis`;
- queue constants: `QUEUE_NAMES`, `QUEUE_NAME_LIST`;
- storage buckets: `STORAGE_BUCKETS`;
- JWT constants;
- pagination defaults;
- upload limits;
- env keys;
- shared Zod env validation helper.

## packages/types

Содержит общие типы без бизнес-логики:

- `User`, `AuthTokens`;
- `Project`, `File`;
- `Scan`, `Report`;
- `QueueJob`;
- `AIUsage`;
- `ApiResponse`, `PaginatedResponse`, `ApiError`;
- enums: `Role`, `ProjectStatus`, `ScanStatus`, `QueueStatus`, `ReportFormat`, `AIProvider`;
- utility types.

## packages/sdk

Содержит единый API SDK:

- `ApiClient` на базе Axios;
- Authorization header support;
- JSON headers;
- baseURL и timeout;
- API modules: `AuthAPI`, `ProjectsAPI`, `UploadsAPI`, `ReportsAPI`, `ChatAPI`, `AdminAPI`;
- `createReviewshaSDK`.

Frontend-приложения используют SDK-слой вместо ручной сборки HTTP-клиента.

## packages/ui

Содержит основу UI Kit:

- components: `Button`, `Input`, `Textarea`, `Select`, `Modal`, `Dialog`, `Card`, `Badge`, `Spinner`, `Loader`, `Avatar`, `Tooltip`, `Table`, `Pagination`, `EmptyState`;
- layout: `PageShell`;
- hooks: `useModal`, `usePagination`, `useDebounce`;
- theme tokens: colors, spacing, radius, typography, shadows, breakpoints.

## Интеграция с приложениями

Приложения подключают workspace-пакеты через зависимости `@reviewsha/*`:

- `apps/api`: `@reviewsha/config`, `@reviewsha/types`;
- `apps/worker`: `@reviewsha/config`, `@reviewsha/types`;
- `apps/web`: `@reviewsha/config`, `@reviewsha/sdk`, `@reviewsha/types`, `@reviewsha/ui`;
- `apps/admin`: `@reviewsha/config`, `@reviewsha/sdk`, `@reviewsha/types`, `@reviewsha/ui`.

Интеграция выполнена без относительных импортов между приложениями и пакетами.

## Тесты

Добавлены тесты shared packages:

```txt
packages/config: 1 test file, 5 tests
packages/types:  1 test file, 3 tests
packages/sdk:    1 test file, 3 tests
packages/ui:     2 test files, 12 tests
```

Итого по этапу 2.3:

```txt
5 test files
23 tests
```

## CI/CD

Добавлен GitHub Actions workflow:

```txt
.github/workflows/ci.yml
```

Pipeline выполняет install, format check, lint, typecheck, test и build.

## Проверки

Успешно выполняются:

```bash
yarn workspace @reviewsha/config build
yarn workspace @reviewsha/types build
yarn workspace @reviewsha/sdk build
yarn workspace @reviewsha/ui build

yarn build:packages
yarn lint
yarn typecheck
yarn test
yarn build
yarn format:check --ignore-unknown
```

## Definition of Done

Этап 2.3 считается завершённым, потому что:

- ✅ созданы все четыре shared-пакета;
- ✅ каждый пакет является самостоятельным workspace-пакетом;
- ✅ каждый пакет имеет `package.json`, `tsconfig.json`, `README.md`, `src/index.ts`;
- ✅ публичные сущности экспортируются через `src/index.ts`;
- ✅ приложения подключают пакеты через workspace-зависимости;
- ✅ общий код не копируется между приложениями;
- ✅ `config` содержит общую конфигурацию;
- ✅ `types` содержит общие типы;
- ✅ `sdk` содержит единый API-клиент;
- ✅ `ui` содержит основу дизайн-системы;
- ✅ добавлены тесты для реализованного общего кода;
- ✅ настроен CI;
- ✅ README и implementation docs обновлены.
