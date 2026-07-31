# Этап 2. Создание монорепозитория

Цель этапа: получить пустой, но полностью рабочий production skeleton проекта.

---

## 2.1. Инициализация Yarn Workspaces

Статус: ✅ COMPLETE

Создано:

```txt
package.json
yarn.lock
.yarnrc
.editorconfig
.gitignore
.prettierignore
README.md
tsconfig.base.json
eslint.config.mjs
.prettierrc.json
```

Workspace layout:

```txt
apps/
├── api
├── web
├── admin
└── worker

packages/
├── ui
├── sdk
├── types
└── config
```

Root scripts:

```bash
yarn dev
yarn build
yarn lint
yarn typecheck
yarn test
yarn format
yarn format:check
yarn clean
yarn workspace:list
```

Root dev dependencies:

```txt
typescript
eslint
prettier
```

Проверено:

```bash
yarn workspaces info
yarn dev
```

Оба вызова успешно выполняются.

---

## 2.2. Создание приложений

Статус: 🟡 IN PROGRESS

Нужно создать реальные scaffold-приложения:

```txt
apps/api      NestJS 11
apps/web      React 19 + Vite
apps/admin    React 19 + Vite
apps/worker   Node/Nest worker + BullMQ bootstrap
```

---

### 2.2.1 Backend API

Статус: ✅ COMPLETE

Создан NestJS 11 skeleton:

```txt
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   └── http-exception.filter.ts
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── config.module.ts
│   │   └── env.schema.ts
│   ├── database/
│   │   ├── database.module.ts
│   │   └── prisma.service.ts
│   ├── modules/
│   └── health/
│       ├── health.controller.ts
│       ├── health.module.ts
│       └── health.service.ts
├── prisma/
│   └── schema.prisma
├── prisma.config.ts
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── .env.example
└── package.json
```

Включено:

- NestJS 11;
- env config через `@nestjs/config` + Zod validation;
- Prisma 7 client подготовлен через `@prisma/adapter-pg`;
- Swagger UI на `/api/docs`;
- OpenAPI JSON на `/api/docs-json`;
- global API prefix `/api`;
- CORS;
- ValidationPipe;
- общий exception filter;
- health endpoint `/api/health`.

Проверено:

```bash
yarn workspace @reviewsha/api prisma:generate
yarn workspace @reviewsha/api typecheck
yarn workspace @reviewsha/api build
yarn workspace @reviewsha/api lint
yarn workspace @reviewsha/api test
yarn workspace @reviewsha/api dev
curl http://localhost:3000/api/health
```

Тесты API:

```txt
6 test files
11 tests
```

Покрыто:

- env schema;
- app config;
- health service;
- health controller;
- exception filter;
- AppModule bootstrap shape.


Ответ:

```json
{
  "status": "ok"
}
```

---

### 2.2.2 Frontend Web

Статус: ✅ COMPLETE

Создан React 19 + Vite skeleton пользовательского приложения:

```txt
apps/web/
├── public/
├── src/
│   ├── app/
│   │   ├── app.tsx
│   │   ├── main.tsx
│   │   ├── providers.tsx
│   │   └── router.tsx
│   ├── api/
│   │   ├── client.ts
│   │   └── index.ts
│   ├── assets/
│   ├── components/
│   │   ├── shared/
│   │   └── ui/
│   ├── features/
│   ├── hooks/
│   ├── layouts/
│   │   ├── AppLayout.tsx
│   │   └── AuthLayout.tsx
│   ├── pages/
│   │   ├── Chat/
│   │   ├── Dashboard/
│   │   ├── Login/
│   │   ├── NotFound/
│   │   ├── Projects/
│   │   ├── Reports/
│   │   └── Settings/
│   ├── stores/
│   │   └── ui.store.ts
│   ├── styles/
│   │   ├── global.css
│   │   └── variables.css
│   ├── types/
│   └── utils/
├── .env.example
├── index.html
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── package.json
```

Подключено:

- React 19;
- Vite;
- TypeScript;
- React Router;
- TanStack Query;
- Zustand;
- React Hook Form;
- Zod;
- Axios;
- `@hookform/resolvers`.

Реализовано:

- app bootstrap через `src/app/main.tsx`;
- `AppProviders` с `QueryClientProvider` и `BrowserRouter`;
- `QueryClient` с `retry`, `staleTime`, `refetchOnWindowFocus`;
- маршруты MVP;
- `AppLayout`;
- `AuthLayout`;
- placeholder страницы;
- login form example через React Hook Form + Zod;
- axios client с `baseURL`, `timeout`, JSON headers и interceptor-заглушками;
- Zustand `ui.store.ts`;
- глобальные стили и CSS variables;
- `.env.example` с `VITE_API_URL`.

Маршруты MVP:

```txt
/
/login
/dashboard
/projects
/projects/:id
/reports/:id
/chat
/settings
*
```

Проверено:

```bash
yarn workspace @reviewsha/web dev
yarn workspace @reviewsha/web build
yarn workspace @reviewsha/web typecheck
yarn workspace @reviewsha/web lint
yarn workspace @reviewsha/web test
yarn build
yarn typecheck
yarn format:check --ignore-unknown
```

Тесты Web:

```txt
6 test files
20 tests
```

Покрыто:

- providers;
- QueryClient defaults;
- API client config;
- Zustand UI store;
- router/routes/root redirect/404;
- login form render/validation/submit;
- AppLayout nav/sidebar.


Dev routes возвращают `200`:

```txt
/
/login
/dashboard
/projects
/projects/123
/reports/abc
/chat
/settings
/unknown
```

---

### 2.2.3 Admin

Статус: ✅ COMPLETE

Создано отдельное административное React 19 + Vite приложение:

```txt
apps/admin/
├── public/
├── src/
│   ├── app/
│   │   ├── app.tsx
│   │   ├── main.tsx
│   │   ├── providers.tsx
│   │   └── router.tsx
│   ├── api/
│   │   ├── client.ts
│   │   ├── client.test.ts
│   │   └── index.ts
│   ├── assets/
│   ├── components/
│   │   ├── shared/
│   │   └── ui/
│   ├── features/
│   │   ├── ai/
│   │   ├── logs/
│   │   ├── projects/
│   │   ├── queues/
│   │   ├── settings/
│   │   └── users/
│   ├── hooks/
│   ├── layouts/
│   │   ├── AdminLayout.tsx
│   │   ├── AdminLayout.test.tsx
│   │   ├── AuthLayout.tsx
│   │   └── AuthLayout.test.tsx
│   ├── pages/
│   │   ├── AI/
│   │   ├── Dashboard/
│   │   ├── Login/
│   │   ├── Logs/
│   │   ├── NotFound/
│   │   ├── Projects/
│   │   ├── Queues/
│   │   ├── Settings/
│   │   └── Users/
│   ├── stores/
│   │   ├── ui.store.ts
│   │   └── ui.store.test.ts
│   ├── styles/
│   │   ├── global.css
│   │   └── variables.css
│   ├── test/
│   │   ├── render.tsx
│   │   └── setup.ts
│   ├── types/
│   └── utils/
├── .env.example
├── index.html
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── package.json
```

Подключено:

- React 19;
- Vite;
- TypeScript;
- React Router;
- TanStack Query;
- Zustand;
- React Hook Form;
- Zod;
- Axios;
- Vitest;
- Testing Library;
- jsdom.

Реализовано:

- независимый app bootstrap через `src/app/main.tsx`;
- `AppProviders` с `BrowserRouter` и `QueryClientProvider`;
- `createAdminQueryClient` с `retry`, `staleTime`, `refetchOnWindowFocus`;
- admin маршруты MVP;
- `AdminLayout`;
- `AuthLayout`;
- placeholder страницы административных разделов;
- admin login form через React Hook Form + Zod;
- Axios admin API client с `baseURL`, `timeout`, JSON headers и interceptor-заглушками;
- Zustand `ui.store.ts`;
- глобальные стили и CSS variables;
- `.env.example` с `VITE_API_URL`;
- заготовки `features/users`, `features/projects`, `features/queues`, `features/logs`, `features/ai`, `features/settings`;
- тестовая инфраструктура Vitest + Testing Library.

Маршруты MVP:

```txt
/
/login
/dashboard
/users
/projects
/queues
/ai
/logs
/settings
*
```

Тесты:

```txt
9 test files
41 tests
```

Покрыто тестами:

- providers;
- QueryClient defaults;
- router;
- route rendering;
- root redirect;
- 404 route;
- AdminLayout;
- AuthLayout;
- navigation links;
- sidebar toggle;
- Zustand UI store;
- API client config;
- login Zod schema;
- login form validation;
- login form submit;
- placeholder pages.

Проверено:

```bash
yarn workspace @reviewsha/admin dev
yarn workspace @reviewsha/admin build
yarn workspace @reviewsha/admin typecheck
yarn workspace @reviewsha/admin lint
yarn workspace @reviewsha/admin test
yarn lint
yarn build
yarn typecheck
yarn test
yarn format:check --ignore-unknown
```

Dev routes возвращают `200`:

```txt
/
/login
/dashboard
/users
/projects
/queues
/ai
/logs
/settings
/unknown
```

---

### 2.2.4 Worker

Статус: ✅ COMPLETE

Создан отдельный Worker service на NestJS 11 + BullMQ:

```txt
apps/worker/
├── src/
│   ├── main.ts
│   ├── main.test.ts
│   ├── worker.module.ts
│   ├── worker.module.test.ts
│   ├── config/
│   │   ├── config.module.ts
│   │   ├── env.schema.ts
│   │   ├── env.schema.test.ts
│   │   ├── worker.config.ts
│   │   └── worker.config.test.ts
│   ├── common/
│   │   ├── logger/
│   │   │   ├── worker-logger.service.ts
│   │   │   └── worker-logger.service.test.ts
│   │   └── shutdown/
│   │       ├── shutdown.service.ts
│   │       └── shutdown.service.test.ts
│   ├── queue/
│   │   ├── queue.constants.ts
│   │   ├── queue.constants.test.ts
│   │   ├── queue.events.ts
│   │   ├── queue.events.test.ts
│   │   ├── queue.module.ts
│   │   ├── queue.service.ts
│   │   └── queue.service.test.ts
│   ├── workers/
│   │   ├── analyze.worker.ts
│   │   ├── base.worker.ts
│   │   ├── cleanup.worker.ts
│   │   ├── extract.worker.ts
│   │   ├── parse.worker.ts
│   │   ├── report.worker.ts
│   │   ├── upload.worker.ts
│   │   └── workers.test.ts
│   ├── processors/
│   ├── services/
│   └── utils/
├── .env.example
├── nest-cli.json
├── package.json
├── tsconfig.build.json
└── tsconfig.json
```

Подключено:

- NestJS 11 application context;
- BullMQ;
- ioredis;
- TypeScript;
- Zod;
- `@nestjs/config`;
- Vitest.

Реализовано:

- standalone bootstrap без HTTP API;
- env validation через Zod;
- `QueueModule`;
- `QueueService`;
- очереди `upload`, `extract`, `parse`, `analyze`, `report`, `cleanup`;
- методы `enqueueUpload`, `enqueueExtract`, `enqueueParse`, `enqueueAnalyze`, `enqueueReport`, `enqueueCleanup`;
- отдельный Worker-класс для каждой очереди;
- базовый `BaseQueueWorker`;
- centralized `WorkerLoggerService`;
- graceful shutdown через `SIGINT` и `SIGTERM`;
- Redis-required mode для production;
- skeleton fallback mode для локального старта без Redis;
- заготовки каталогов `processors`, `services`, `utils`.

Startup logs при наличии Redis:

```txt
Redis connected
Queues initialized
UploadWorker started
ExtractWorker started
ParseWorker started
AnalyzeWorker started
ReportWorker started
CleanupWorker started
Worker started
Registered queues: upload, extract, parse, analyze, report, cleanup
Waiting for jobs...
```

Тесты:

```txt
10 test files
33 tests
```

Покрыто тестами:

- env schema;
- worker config mapping;
- queue constants;
- queue event log formatters;
- QueueService queue list;
- QueueService skeleton mode;
- QueueService required Redis failure mode;
- enqueue methods;
- worker registration and close;
- WorkerLoggerService;
- ShutdownService signal binding;
- all six Worker classes;
- WorkerModule;
- bootstrap export.

Проверено:

```bash
yarn workspace @reviewsha/worker dev
yarn workspace @reviewsha/worker build
yarn workspace @reviewsha/worker lint
yarn workspace @reviewsha/worker typecheck
yarn workspace @reviewsha/worker test
yarn lint
yarn build
yarn typecheck
yarn test
yarn format:check --ignore-unknown
```

Acceptance Redis check выполнен с локальным Docker Redis container:

```txt
reviewsha-redis-worker-test
redis:7-alpine
localhost:6379
```

---

### 2.3. Создание packages

Статус: ⏳ NEXT

```txt
packages/ui
packages/sdk
packages/types
packages/config
```


---

## Definition of Done этапа 2.2

Файл:

```txt
docs/implementation/stage-2-2-definition-of-done.md
```

---

## 2.3. Shared Packages

Статус: ✅ COMPLETE

Создан набор общих workspace-пакетов:

```txt
packages/
├── config
├── types
├── sdk
└── ui
```

### 2.3.1 packages/config

Содержит общую конфигурацию проекта:

- API prefix/version/timeout;
- default URLs для API, Web, Admin, MinIO, Redis;
- env keys;
- queue names;
- storage bucket names;
- JWT constants;
- pagination defaults;
- upload limits;
- shared Zod env validation.

### 2.3.2 packages/types

Содержит общие TypeScript-типы без бизнес-логики:

- `User`;
- `Project`;
- `Scan`;
- `Report`;
- `File`;
- `QueueJob`;
- API response types;
- enums для roles, project/scan/queue status, report formats, AI providers;
- utility types.

### 2.3.3 packages/sdk

Содержит единый API SDK:

- `ApiClient` на базе Axios;
- Authorization header support;
- JSON headers;
- `baseURL` и `timeout`;
- `AuthAPI`;
- `ProjectsAPI`;
- `UploadsAPI`;
- `ReportsAPI`;
- `ChatAPI`;
- `AdminAPI`;
- `createReviewshaSDK`.

`apps/web` и `apps/admin` теперь подготавливают API layer через shared SDK.

### 2.3.4 packages/ui

Содержит каркас общего UI Kit:

```txt
Button
Input
Textarea
Select
Modal
Dialog
Card
Badge
Spinner
Loader
Avatar
Tooltip
Table
Pagination
EmptyState
```

Также добавлены:

- `PageShell`;
- `useModal`;
- `usePagination`;
- `useDebounce`;
- theme tokens.

### Workspace integration

Приложения подключают shared packages через workspace-зависимости:

```txt
@reviewsha/config
@reviewsha/types
@reviewsha/sdk
@reviewsha/ui
```

Для Yarn Classic используется локальная workspace-версия `0.0.0`, так как проект сейчас работает на Yarn `1.22.22`.

### CI/CD

Добавлен GitHub Actions pipeline:

```txt
.github/workflows/ci.yml
```

Pipeline выполняет:

```bash
yarn install --frozen-lockfile
yarn format:check --ignore-unknown
yarn lint
yarn typecheck
yarn test
yarn build
```

### Тесты shared packages

```txt
packages/config: 1 test file, 5 tests
packages/types:  1 test file, 3 tests
packages/sdk:    1 test file, 3 tests
packages/ui:     2 test files, 12 tests
```

Итого добавлено по этапу 2.3:

```txt
5 test files
23 tests
```

Проверено:

```bash
yarn build:packages
yarn lint
yarn typecheck
yarn test
yarn build
yarn format:check --ignore-unknown
```

Подробный DoD:

```txt
docs/implementation/stage-2-3-shared-packages.md
```
