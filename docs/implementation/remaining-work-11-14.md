# Реальная карта незакрытых задач 11–14.2

Дата сверки: 2026-08-11. Этот файл не заменяет тесты: пункт считается закрытым
только после изменения кода, теста, локального CI и GitHub Actions.

## 11.1 Chat Module — осталось

1. **Полный HTTP acceptance matrix**: create/list session, history pagination,
   search/before/after, send, delete, invalid IDs и malformed history.
   Файлы: `apps/api/src/modules/chat/chat.controller.ts`,
   `apps/api/src/modules/chat/chat.service.ts`,
   `apps/api/tests/integration/modules/chat/`.
2. **Idempotency в сохранении сообщений**: проверить не только queue job ID,
   но и повторный HTTP POST с тем же ключом; при повторе возвращать исходный
   результат без второго assistant message.
   Файлы: `apps/api/src/modules/chat/chat.service.ts`,
   `apps/api/src/modules/chat/repositories/`, Prisma schema, integration tests.
3. **Security matrix** для чужих user/session/project IDs через HTTP.
   Файлы: `apps/api/tests/integration/modules/chat/chat.security.integration.test.ts`,
   `chat.session-security.integration.test.ts`.

## 11.2 Context & Streaming — осталось

1. Закрыть real-provider SSE acceptance: token, usage, done, provider error,
   timeout, malformed event и disconnect.
   Файлы: `apps/api/src/modules/chat/chat-streaming.service.ts`,
   `apps/api/src/modules/chat/providers/`,
   `apps/worker/src/processors/chat.processor.ts`,
   `packages/sdk/src/client/api-client.ts`.
2. Проверить partial response policy при disconnect и отсутствие зависших
   Redis subscriptions/jobs.
   Файлы: `apps/api/src/modules/chat/chat-streaming.service.ts`,
   `apps/worker/src/processors/chat-stream-control.service.ts`, integration tests.
3. Добавить нагрузочные/concurrent-session tests и измерение token usage.
   Файлы: `apps/api/tests/integration/modules/chat/`,
   `apps/worker/tests/unit/processors/chat.processor.test.ts`.

## 12.1 Core Web — осталось

1. Довести component tests UI Kit до состояний loading/error/disabled/focus и
   accessibility.
   Файлы: `packages/ui/src/`, `packages/ui/tests/`, `apps/web/src/`.
2. Добавить реальные auth/dashboard integration tests: refresh, concurrent
   401, logout, empty/error/retry и dashboard data.
   Файлы: `apps/web/src/features/auth/`, `apps/web/src/pages/dashboard/`,
   `apps/web/tests/`.
3. Добавить responsive/accessibility E2E, а не только anonymous route smoke.
   Файлы: `tests/e2e/web.spec.ts`, `playwright.config.ts`.

## 12.2 User Features — осталось

1. Сквозной real API flow Project → ZIP → Version → Analysis → Report →
   Compare → Chat → Settings.
   Файлы: `apps/web/src/pages/Projects/`, `Reports/`, `Chat/`, `Settings/`,
   `apps/web/src/api/`, `tests/e2e/`.
2. Проверить upload cancellation/progress/retry и analysis polling на реальном
   backend; исключить duplicate start.
   Файлы: `apps/web/src/pages/Projects/ProjectsPage.tsx`,
   `apps/web/src/features/`, SDK upload/pipeline APIs.
3. Реализовать/проверить chat retry/cancel/reconnect и restoration после reload.
   Файлы: `apps/web/src/pages/Chat/`, `packages/sdk/src/chat/`, E2E.
4. Увеличить component/integration coverage для loading/empty/error/permissions.

## 13.1 Admin Core — осталось

1. Полная backend RBAC matrix для USER/ADMIN/SUPER_ADMIN по users/projects и
   прямым API requests.
   Файлы: `apps/api/src/modules/admin/`,
   `apps/api/tests/integration/modules/admin/admin.security.integration.test.ts`.
2. Реальные user/project detail actions, pagination/search/filter и
   destructive confirmation только если endpoint существует.
   Файлы: `apps/admin/src/pages/Users/`, `Projects/`, `apps/admin/src/api/`,
   SDK admin API.
3. Admin E2E: login, denied USER, reload, users, projects, logout.
   Файлы: `tests/e2e/admin.spec.ts`, `playwright.config.ts`.

## 13.2 Administration — осталось

1. Queue overview/jobs/details/retry/remove через API с pagination и polling;
   проверить все статусы.
   Файлы: `apps/api/src/modules/admin/`, `apps/admin/src/pages/Queues/`, SDK.
2. Logs server-side filters/search/details и подтверждение masking secrets.
   Файлы: `apps/api/src/modules/admin/`, `apps/admin/src/pages/Logs/`.
3. AI usage/statistics filters, provider/user/project breakdown и текстовая
   альтернатива графикам.
   Файлы: `apps/admin/src/pages/AI/`, `Statistics/`, соответствующие DTO/tests.
4. Security/performance E2E для admin endpoints и больших коллекций.

## 14.1 OpenAPI & SDK — осталось

1. Убрать оставшиеся ручные API response/request модели там, где уже есть
   generated schemas; custom-классы должны быть только transport wrappers.
   Файлы: `packages/sdk/src/*/*.api.ts`, `packages/sdk/src/generated/openapi.ts`.
2. Зафиксировать и протестировать `sdk:check`, OpenAPI validation, upload,
   download, SSE и error contract.
   Файлы: `scripts/validate-openapi.mjs`, `packages/sdk/tests/`, CI workflow.
3. Исправить migration drift и обеспечить воспроизводимость OpenAPI/SDK.
   Файлы: `apps/api/prisma/migrations/`, `docs/api/`, package scripts.

## 14.2 Frontend Integration — осталось

1. Проверить все business API calls Web/Admin: один SDK client, один auth/
   refresh lock, единые error mapping/query keys.
   Файлы: `apps/web/src/api/`, `apps/admin/src/api/`, `packages/sdk/src/client/`.
2. Удалить необоснованные direct `fetch/axios`; streaming/upload transport
   оставить только внутри SDK.
3. Добавить integration tests Web/Admin → SDK → API и critical E2E.
4. После каждого блока: `yarn test:stageN`, `yarn typecheck:apps`,
   `yarn ci:openapi`, format, commit, push и проверка GitHub Actions.

## Текущие реальные блокеры

- База на локальном Docker volume содержит migration drift: deploy падает на
  существующей `ai_responses`; исправление должно быть сделано через безопасный
  migration resolve/repair, не удалением данных.
- Полный Playwright flow не поднимает API/database/worker автоматически;
  `playwright.config.ts` нужно расширить для real acceptance.
- Количество тестов из плана (70+/40+/15+ и т.д.) не является доказательством
  само по себе: нужны сценарии, покрывающие перечисленные требования.
