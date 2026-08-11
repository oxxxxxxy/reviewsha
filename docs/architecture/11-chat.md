# AI Chat

## 11.1 Base module

`ChatController → ChatService → chat.queue → ChatProcessor → shared AIService → PostgreSQL`.
Сессии и сообщения защищены JWT и ownership. Контекст строится по последнему завершённому анализу
и отчёту; секреты фильтруются до отправки провайдеру.

Базовые HTTP-операции 11.1: создание, получение и список сессий, удаление сессии, пагинированная
история и синхронная отправка сообщения. Для повторов клиент может передать `Idempotency-Key`;
ключ сохраняется вместе с user/assistant message, а deterministic UUID job id предотвращает
создание второго сообщения и второй задачи после сетевого повтора или перезапуска API.

## 11.2 Context and memory

Приоритет: текущий вопрос → связанные findings/files → analysis → report summary → последние
сообщения → compressed summary. `ChatMemoryService` хранит обсуждаемые файлы, проблемы,
рекомендации и active topic. Контекст кэшируется в Redis по analysis identity и термам вопроса;
при cache outage используется in-memory fallback.

## Streaming

`POST /api/v1/chat/:sessionId/stream`, `text/event-stream`. События: `token`, `complete`, `error`.
API подписывается на Redis stream channel, а Worker публикует provider chunks после
`AIService.stream()`. OmniRouterProvider читает OpenAI-compatible SSE напрямую, поэтому
ответ не буферизуется в API. При закрытии соединения API отправляет cancel signal Worker;
upstream request отменяется через `AbortSignal`. Сообщение и `ChatUsage` сохраняются в
PostgreSQL только после завершения генерации.

История поддерживает `page`, `limit`, `search`, `before`, `after`, `sort`.
