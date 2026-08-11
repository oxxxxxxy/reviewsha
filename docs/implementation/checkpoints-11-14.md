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

Для отдельного checkpoint 12.1 локальный CI-набор должен включать:

```text
yarn test:stage12
yarn workspace @reviewsha/web test
yarn workspace @reviewsha/admin test
yarn lint
yarn format:check --ignore-unknown
```

В этом commit фиксируется checkpoint 12.1 Core Application; функциональные
ограничения, требующие browser/manual QA, остаются явно отмечены выше.

## 12.2 — User Features checkpoint

Projects, upload/version lifecycle, analysis polling/status, reports
download/compare, chat UI и settings подключены к API layer. Для destructive
действий в Projects добавлено доступное подтверждение через общий `Modal`, а
не `window.confirm`; добавлен UI regression test, проверяющий, что удаление не
вызывается до подтверждения.

Проверка перед checkpoint:

```text
yarn workspace @reviewsha/web test
yarn workspace @reviewsha/web typecheck
yarn lint
yarn format:check --ignore-unknown
```

Полный browser E2E с реальными API/Worker и responsive/accessibility QA по-
прежнему остаются acceptance-задачами из основного аудита.

## 13.1 / 13.2 — Admin Core и Administration

Admin app использует RBAC-protected API, overview, dedicated users/projects
endpoints, server-side search/pagination, role/status filters, details pages and
explicit role/status mutations. Users and projects tables expose the
administrative identifiers/status/aggregate fields needed for triage. Queues,
logs, AI usage и statistics остаются backend-owned
operational APIs. Операционные E2E/security IDOR matrix и manual QA остаются
отдельными acceptance-задачами.

Для checkpoint 13.1 локальный CI-набор включает:

```text
yarn test:stage13
yarn workspace @reviewsha/admin test
yarn lint
yarn format:check --ignore-unknown
```

Admin security boundary проверяется backend HTTP role matrix; обычный USER не
получает административные handlers, а ADMIN получает разрешённый доступ.

## 13.2 — Administration checkpoint

Queue health/state filters, paginated jobs, safe job details, retry/remove,
masked logs, server-side event/request/user log filters, AI usage breakdown and
user/project filters, и date-filtered statistics подключены к Admin API/UI.
Statistics UI предоставляет периоды 24h/7d/30d. Destructive user/job actions
требуют явного подтверждения, а secrets не выдаются в job/log payloads. Тесты
для текущих queue/logs/usage/statistics contracts входят в `yarn test:stage13`;
расширенная operational и manual QA
остаётся явно отмеченной в audit.

Проверка перед checkpoint:

```text
yarn test:stage13
yarn workspace @reviewsha/admin test
yarn lint
yarn format:check --ignore-unknown
```


## 14.1 / 14.2 — OpenAPI, SDK и frontend integration

Canonical OpenAPI генерируется в `docs/generated/openapi.json`, SDK drift
проверяется `yarn sdk:check`, а Web/Admin используют общий typed SDK client.
Admin users/projects list, details and update operations теперь также проходят
через generated contract; SSE остаётся отдельным typed transport. Оставшаяся
миграция ручных DTO и полный contract/E2E coverage отмечены в основном аудите.

Для checkpoint 14.1 добавлен SDK contract regression test для Chat, streaming
и Admin paths в canonical OpenAPI artifact.

Проверка перед checkpoint:

```text
yarn sdk:check
yarn workspace @reviewsha/sdk test
yarn workspace @reviewsha/sdk typecheck
yarn lint
yarn format:check --ignore-unknown
```

## 14.2 — Frontend Integration checkpoint

Web и Admin используют единый SDK client с централизованными base URL,
Authorization, refresh и typed API/query layers. SSE остаётся отдельным
typed transport в SDK, а React query functions передают cancellation signals.

Проверка перед checkpoint:

```text
yarn test:stage14
yarn workspace @reviewsha/web test
yarn workspace @reviewsha/admin test
yarn lint
yarn format:check --ignore-unknown
```

Оставшиеся DTO audit, cache invalidation matrix и real-API browser E2E
зафиксированы в основном audit и не выдаются за закрытые manual gates.
