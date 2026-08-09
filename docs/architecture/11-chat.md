# AI Chat

## 11.1 Base module

`ChatController → ChatService → chat.queue → ChatProcessor → shared AIService → PostgreSQL`.
Сессии и сообщения защищены JWT и ownership. Контекст строится по последнему завершённому анализу
и отчёту; секреты фильтруются до отправки провайдеру.

## 11.2 Context and memory

Приоритет: текущий вопрос → связанные findings/files → analysis → report summary → последние
сообщения → compressed summary. `ChatMemoryService` хранит обсуждаемые файлы, проблемы,
рекомендации и active topic. Контекст кэшируется в Redis по analysis identity и термам вопроса;
при cache outage используется in-memory fallback.

## Streaming

`POST /api/v1/chat/:sessionId/stream`, `text/event-stream`. События: `token`, `complete`, `error`.
Закрытие соединения прекращает выдачу. Сообщение и `ChatUsage` сохраняются в PostgreSQL.

История поддерживает `page`, `limit`, `search`, `before`, `after`, `sort`.
