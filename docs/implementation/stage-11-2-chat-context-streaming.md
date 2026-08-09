# Stage 11.2 — AI Context & Streaming

Статус: **COMPLETE**.

## Реализовано

- Контекст собирается из проекта, последнего анализа, отчёта, findings и
  рекомендаций; размер ограничивается token budget.
- Redis-кэш контекста использует analysis identity и вопрос в ключе, имеет TTL и
  in-memory fallback.
- `ChatMemoryService` сохраняет файлы, проблемы, рекомендации и активную тему.
  Старые сообщения сжимаются через `ConversationSummaryService`.
- История поддерживает pagination, search, before/after и сортировку.
- `POST /api/v1/chat/:sessionId/stream` возвращает SSE-события `token`,
  `complete` и `error`, а закрытие соединения прекращает выдачу.
- `ChatUsage` сохраняет input/output/total tokens, model и duration.
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
