# Stage 11.2 — AI Context & Streaming

> **Historical implementation note.** This document records an earlier plan or execution checkpoint. It is retained for traceability; current behavior is defined by code and the canonical docs index.

Статус: **IMPLEMENTED; real-provider acceptance QA продолжается**.

## Реализовано

- Контекст собирается из проекта, последнего анализа, отчёта, findings и
  рекомендаций; размер ограничивается token budget.
- Redis-кэш контекста использует analysis identity и вопрос в ключе, имеет TTL и
  in-memory fallback.
- `ChatMemoryService` сохраняет файлы, проблемы, рекомендации и активную тему.
  Память объединяется с предыдущей памятью сессии; старые сообщения сжимаются через
  `ConversationSummaryService`.
- История поддерживает pagination, search, before/after и сортировку.
- `POST /api/v1/chat/:sessionId/stream` возвращает SSE-события `token`,
  `complete` и `error`, а закрытие соединения прекращает выдачу.
- `ChatUsage` сохраняет input/output/total tokens, model и duration.
- Redis stream subscribers/publishers закрываются после завершения запроса и при shutdown;
  malformed broker events преобразуются в stream error.
- Ownership и secret redaction выполняются до построения prompt.
- Worker получает memory, summary и active topic вместе с историей диалога.

## Контракт SSE

```text
event: token
data: {"token":"..."}

event: complete
data: {"messageId":"...","tokens":123}
```

Обычный `POST /api/v1/chat/:sessionId/messages` остаётся non-streaming fallback.

## Проверки

Context, memory, summary, cache, history, ownership, secret filtering, streaming,
Worker processor и token usage покрыты unit/integration тестами. Полный прогон
выполняется через `yarn ci:local`.
