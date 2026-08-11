# Chat backend

Chat состоит из session/conversation semantics в API и AI generation в Worker.
Controller делегирует ChatService; provider не вызывается прямо из Controller.

## REST endpoints

```text
POST   /projects/:projectId/chat
GET    /projects/:projectId/chat
GET    /chat/:sessionId
DELETE /chat/:sessionId
GET    /chat/:sessionId/messages
POST   /chat/:sessionId/messages
POST   /chat/:sessionId/stream
```

Все routes находятся под `/api/v1`, требуют authentication и ownership.
Pagination/history filters смотрите в OpenAPI, а не копируйте вручную в UI.

## Lifecycle

```text
user message
  → validate + persist
  → build bounded context
  → enqueue/request AI
  → stream/provider result
  → persist complete assistant message
```

При provider failure user message не превращается в ложный successful assistant
message. Idempotency key и concurrent coalescing защищают retry flow от
дубликатов.

## Streaming

Typed events transport-уровня документированы в SDK и OpenAPI. API stream
передаёт chunks через Worker/Redis broker; при `complete` сохраняется полный
ответ. Disconnect/cancellation и real provider QA выполняются отдельно.

## Context

Context builder ограничивает history, tokens, project context и message length.
Summary/memory/cache сокращают повторную отправку старых сообщений. Sensitive
project data не должна попадать в обычные logs.
