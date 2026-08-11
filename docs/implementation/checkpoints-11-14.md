# Этапы 11–14 — execution checkpoints

Этот журнал фиксирует отдельные checkpoints по крупным подпунктам (`11.1`,
`11.2`, `12.1`, `12.2`, `13.1`, `13.2`, `14.1`, `14.2`). Статус `PARTIAL` в
основном аудите сохраняется до прохождения manual QA, security matrix и
реального end-to-end сценария; checkpoint означает, что локальные проверки
конкретного блока выполнены.

## 11.1 — Chat Module

Реализованный backend включает chat sessions/conversations, ownership checks,
history pagination/search, message lifecycle, idempotent retry handling,
project availability guard и SSE entrypoint. Тесты покрывают service,
controller, HTTP integration и security paths.

Проверка перед checkpoint:

```text
yarn test:stage11
yarn lint
yarn format:check --ignore-unknown
```

Оставшиеся acceptance-задачи перечислены в
`docs/implementation/stages-11-14-completion-audit.md` и не маскируются этим
checkpoint.

## 11.2 — AI Context & Streaming

Контекст строится отдельными сервисами memory/summary/cache/context builder,
а provider SSE проходит через Worker/Redis broker/API. В этот checkpoint также
входит строгая валидация структурированного AI-ответа: невалидный JSON,
severity и поля теперь завершают запрос ошибкой, а не превращаются в пустой
успешный результат.

Проверка перед checkpoint:

```text
yarn test
yarn typecheck
yarn format:check --ignore-unknown
```

Реальный provider streaming и disconnect QA должны выполняться отдельно с
запущенными PostgreSQL, Redis и OmniRoute.

## 12.1 / 12.2 — Web Core и User Features

Текущий Web использует общий UI Kit, защищённые routes, SDK auth refresh,
projects/upload/analysis/reports/chat/settings screens и единый loading/error
подход. Полный browser E2E и responsive/accessibility QA остаются частью
acceptance.

## 13.1 / 13.2 — Admin Core и Administration

Admin app использует RBAC-protected API, overview, users/projects, queues,
logs, AI usage и statistics. Операционные E2E/security IDOR matrix и manual QA
остаются отдельными acceptance-задачами.

## 14.1 / 14.2 — OpenAPI, SDK и frontend integration

Canonical OpenAPI генерируется в `docs/generated/openapi.json`, SDK drift
проверяется `yarn sdk:check`, а Web/Admin используют общий typed SDK client.
Оставшаяся миграция ручных DTO и полный contract/E2E coverage отмечены в
основном аудите.

