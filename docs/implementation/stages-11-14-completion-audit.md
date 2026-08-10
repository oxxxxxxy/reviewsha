# Этапы 11–14 — Implementation Completion Audit

Дата сверки: 2026-08-10  
Последний проверенный коммит: `0f6d139`

Этот файл является рабочей сверкой по требованиям планов этапов 11–14. Статус
`PARTIAL` означает, что базовая функциональность есть, но критерий полного
закрытия этапа ещё не выполнен.

## Сводка

| Этап | Статус | Ключевой результат |
| --- | --- | --- |
| 11.1 Chat Module | PARTIAL | Conversation/message lifecycle, ownership, history, memory и API реализованы; полный acceptance QA не закрыт. |
| 11.2 AI Context & Streaming | PARTIAL | Provider-to-Worker-to-API streaming реализован через OmniRouter SSE и Redis broker; real end-to-end/disconnect QA ещё не закрыты. |
| 12.1 Core Application | FUNCTIONAL / QA PARTIAL | UI Kit, auth, protected routes и Dashboard работают через реальный API; не закрыты требуемые объёмы тестов и ручной QA. |
| 12.2 User Features | PARTIAL | Projects, upload, analysis, reports, chat и settings подключены; отсутствует полный пользовательский E2E и часть UX/API coverage. |
| 13.1 Admin Core | PARTIAL | Отдельный Admin, RBAC, users/projects, overview и queue core есть; security matrix и полный E2E не закрыты. |
| 13.2 Administration | PARTIAL | Queues с pagination, safe job details и backend ERROR handling, masked logs, AI usage и date-filtered statistics есть; расширенные filters/details/charts/QA не завершены. |
| 14.1 OpenAPI & SDK | PARTIAL | OpenAPI генерируется/валидируется, generated types и drift check есть; runtime SDK и все DTO ещё не полностью generated/единые. |
| 14.2 Frontend Integration | PARTIAL | Web/Admin используют общий SDK client, auth/refresh централизованы; миграция, cancellation/race/contract coverage и critical E2E не завершены. |

## 11.1 Chat Module

### Уже сделано

- `ChatModule` подключён в API и отделён от Worker AI processing.
- Реализованы conversation/session и user/assistant message lifecycle.
- Conversation и messages защищены ownership-проверками.
- Реализованы history pagination, search, `before` и `after` параметры.
- Реализованы context builder, memory, summary/compression, Redis cache и secret filtering.
- Chat использует общий AI provider abstraction, а не отдельный DeepSeek client.
- Есть SSE endpoint, сохранение assistant message и usage metadata.
- Unit/integration tests Chat Module проходят.

### Что доработать до COMPLETE

1. Добавить полноценный acceptance matrix для всех conversation/message endpoints:
   create, list, get, send, history, delete/archive, ownership и malformed history.
2. Добавить backend security tests для каждого endpoint с чужими `userId`,
   `conversationId` и `projectId`, включая IDOR-проверки через HTTP.
3. Реализовать idempotency key и backend deduplication для повторной отправки
   одного сообщения; API принимает `idempotencyKey`, а Queue job получает
   детерминированный ID.
4. Добавить полные E2E и manual QA сценарии из плана 11.

## 11.2 AI Context & Streaming

### Уже сделано

- Контекст включает проект, анализ, report/findings, связанные файлы и историю.
- Приоритеты контекста и ограничения размера реализованы на backend.
- Реализованы `ChatMemoryService`, `ConversationSummaryService` и context cache.
- История имеет пагинацию/поиск и не отправляется в модель целиком.
- SSE transport, final event, ошибки и token usage API существуют.
- Prompt отделяет system instructions, user message и project content.
- Реальный локальный OmniRoute установлен в root через Yarn и запущен на
  `http://localhost:20128`; API `/v1/models` и DeepSeek SSE проверены.

### Реализованный streaming path

1. `AIProvider.stream()` и `AIService.stream()` передают async iterable chunks.
2. `OmniRouterProvider` читает `text/event-stream`, `[DONE]` и usage.
3. Worker публикует chunks через Redis broker, API передаёт их SSE-клиенту.
4. Assistant message/usage сохраняются до `complete` event.
5. Disconnect публикует cancel control event и передаёт AbortSignal upstream.
6. Повторная отправка с одинаковым `idempotencyKey` переиспользует существующий
   chat job вместо создания второго пользовательского сообщения/job.

### Что ещё проверить до COMPLETE

1. Real API → Redis → Worker → API → browser E2E с работающими PostgreSQL/Redis.
2. Disconnect во время provider response и отсутствие зависших jobs/connections.
3. Retry/error policy после partial chunks и восстановление истории.
4. Contract/OpenAPI и manual QA для streaming на desktop/mobile.

## 12.1 Core Application

### Уже сделано

- `apps/web` на React/Vite с Router, layouts и protected routes.
- Общий `packages/ui` и design tokens используются Web-приложением.
- Login/register/logout/session restore/refresh реализованы через SDK.
- Dashboard получает реальные project/analysis/report aggregates, имеет loading,
  empty и error states.
- Settings profile/security/preferences реализованы.
- ErrorBoundary и базовые responsive/accessibility состояния присутствуют.
- Shared `Modal` manages initial focus and Escape-to-close; Admin queue removal
  and Web project archiving use it instead of `window.confirm`.

### Что доработать

1. Провести и зафиксировать manual QA на desktop/tablet/mobile и accessibility.
2. Расширить тесты до acceptance coverage плана 12.1: UI Kit, Auth, Dashboard,
   integration и E2E сценарии, а не только текущий smoke/component набор.
3. Добавить отдельный backend dashboard statistics contract, если агрегаты из
   списка проектов не соответствуют окончательному API contract.
4. Проверить refresh/logout/cache cleanup в браузере с реальным истёкшим token.

## 12.2 User Features

### Уже сделано

- Projects list/create/detail/edit/archive, search/sort/pagination и confirmation.
- ZIP drag-and-drop, validation, progress, cancel и retry path.
- Version list, start analysis, status polling и result states.
- Reports list/detail, Markdown/PDF/JSON download и compare.
- Chat sessions/history/input/stream UI, retry/cancel states и Markdown-ready view.
- Settings profile, password/security и local preferences.
- API operations проходят через SDK/API layer, а не через feature-level fetch.

### Что доработать

1. Завершить project versions/analysis navigation и показать все реальные backend
   lifecycle states без выдуманного процента прогресса.
2. Довести upload retry/cancel UX и восстановление после reload/navigation.
3. Довести report history, compare diff и export error handling.
4. Завершить Chat с настоящим provider streaming из раздела 11.2.
5. Добавить полный acceptance E2E: Register → Project → Upload → Analysis →
   Report → Export → Compare → Chat → Settings → Logout.
6. Провести negative, responsive и accessibility QA и расширить тестовое покрытие
   до критических сценариев плана.

## 13.1 Admin Core

### Уже сделано

- Отдельное `apps/admin` с layout, routes и protected admin route.
- Backend Admin API защищён JWT/RolesGuard, Frontend не является security boundary.
- Admin login/session/refresh/logout.
- Admin overview с реальными API metrics.
- Users/projects list, server-side search/pagination и details pages.
- Admin user details now include owned projects and recent project activity;
  admin project details include owner, uploaded versions and analysis summary.
- Queue overview, jobs, retry/remove API и UI.

### Что доработать

1. Расширять user/project summaries только при появлении новых backend fields;
   current ownership, activity, versions and analyses summaries are implemented.
3. Реализовывать block/unblock/role mutation только после наличия backend API.
4. Создать HTTP security matrix: USER → 403 для каждого `/admin/*` endpoint,
   включая mutations и прямые запросы с подменёнными IDs.
5. Добавить полноценные Admin E2E и manual responsive/accessibility QA.

## 13.2 Administration

### Уже сделано

- Queue metrics with backend HEALTHY/DEGRADED status, jobs pagination, retry/remove и polling.
- Server-side queue state filtering and a safe job-details endpoint (job payloads are never returned).
- Persisted `AdminLog` с masking чувствительных данных.
- Server-side logs pagination, search, level/service/date filters и masked details.
- Log details include a browser copy action for stack traces.
- AI usage summary and backend breakdown by provider/user/project with date/provider/model/user/project filters.
- AI failure diagnostics table with provider/model/error/project/timestamp and
  persisted response latency when available; retry count remains unavailable in
  the current `AIRequest` schema and is not fabricated by the UI.
- Statistics endpoint с date range и UI period selector.
- Admin API contracts и OpenAPI response schemas обновляются.

### Что доработать

1. Queue: pagination UX, safe job details page, backend `ERROR` handling and accessible destructive-action confirmation are implemented; remaining work is broader operational QA.
2. Continue operational QA for queue retry/remove, failed-job recovery and concurrent admin sessions.
3. Logs: level enum control, полный details/error UX и QA (copy stack trace уже есть).
4. AI Usage: retry count requires a persisted retry/attempt field in the
   backend schema; current failure table, latency and provider/model details are
   implemented without inventing that metric.
5. Statistics: processing-stage metrics, success rate and average duration are
   now backend-owned; useful charts and text alternative for accessibility remain.
6. Добавить требуемые unit/integration/E2E и security tests; проверить отсутствие
   secrets в реальных persisted logs.

## 14.1 OpenAPI & SDK

### Уже сделано

- Canonical artifact: `docs/generated/openapi.json`.
- `yarn docs:openapi`, `yarn openapi:validate`, `yarn sdk:generate`,
  `yarn sdk:check` работают.
- OpenAPI validation проверяет paths, refs и response schemas.
- Chat and Admin controllers now publish the shared standard error schemas for
  400/401/403/404/422/500 responses.
- Generated OpenAPI TypeScript contract хранится в
  `packages/sdk/src/generated/openapi.ts`.
- Admin response DTOs и SDK Admin types связаны с generated schemas.
- SDK client имеет base URL, auth headers, refresh и single-flight refresh.
- Auth `LoginRequest` и `RegisterRequest` в SDK теперь напрямую выведены из
  generated OpenAPI schemas; response/domain types сохраняются shared там, где
  они используются приложениями.
- Project create/update request contracts теперь выводят поля из generated
  OpenAPI schemas; nullable description/language в OpenAPI исправлены на `string`.

### Что доработать

1. Выбрать и закрепить стратегию runtime generation: generated service methods
   либо один документированный custom wrapper поверх generated types.
2. Удалить/заменить ручные API DTO там, где уже есть generated schemas.
3. Полностью описать error responses, upload/download и SSE response contracts.
4. Добавить contract tests Backend → OpenAPI → SDK для Auth, Projects, Upload,
   Reports, Chat и Admin.
5. Увеличить SDK/OpenAPI/integration test coverage до acceptance requirements.
6. Проверить reproducible regeneration на чистой установке и отсутствие drift.

## 14.2 Frontend Integration

### Уже сделано

- Web и Admin используют `@reviewsha/sdk`.
- Auth, base URL, headers, refresh и concurrent refresh централизованы.
- SSE и upload low-level transport находятся в SDK/API layer.
- SDK propagates `AbortSignal` through project/search, upload, analysis, report,
  chat history and report-download requests; Web query functions pass TanStack
  Query cancellation signals.
- Основные Web/Admin features используют typed SDK вместо feature-level fetch.
- Typecheck, build/quality и app tests проходят.

### Что доработать

1. Провести автоматический audit всех `fetch`, `axios` и ручных DTO; оставить
   только обоснованный transport внутри SDK.
2. Перевести оставшиеся ручные response/request модели на generated/shared types.
3. Расширить cancellation и race-condition tests для upload, analysis, report
   downloads и chat stream (SDK signal propagation smoke test уже добавлен).
4. Проверить query keys/cache invalidation после каждой mutation.
5. Добавить critical Web/Admin integration и E2E flows через реальный API.
6. Проверить bundle, duplicate requests, polling и streaming render performance.

## Обязательная последовательность закрытия

1. Настоящий provider streaming и disconnect cancellation (11.2).
2. Backend security matrix и IDOR tests для Chat/Admin.
3. Доведение Admin Queues/Logs/AI Usage/Statistics до полного API contract.
4. Полный OpenAPI error/upload/download/SSE contract и SDK drift verification.
5. Удаление DTO/API duplication в Web/Admin.
6. Полный test matrix: unit, integration, E2E, real OmniRoute/DeepSeek и manual QA.
7. Обновление README/status только после прохождения всех проверок.
8. Отдельный commit на каждый законченный блок; перед каждым commit запускать
   тот же набор локальных CI-команд, затем push.

## Критерий полного закрытия 11–14

Считать этапы закрытыми только когда проходят все функциональные acceptance
flows, security matrix, contract checks, real OmniRoute/DeepSeek streaming,
unit/integration/E2E tests, manual responsive/accessibility QA и документация
отражает фактическую реализацию. До этого статусы должны оставаться `PARTIAL` или
`IN PROGRESS`.
