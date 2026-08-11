# Stage 11.1 — Chat Module

> **Historical implementation note.** This document records an earlier plan or execution checkpoint. It is retained for traceability; current behavior is defined by code and the canonical docs index.

Статус: **IMPLEMENTED; acceptance verification продолжается**.

## Реализация

- NestJS `ChatModule`: controller, services, repository, DTO и Swagger.
- `ChatSession` и `ChatMessage` сохраняются в PostgreSQL; сообщения содержат token count,
  request id и durable `idempotencyKey` для повторов.
- API: создание/получение/список/удаление сессий, пагинированная история и отправка сообщения.
- JWT, project ownership и session ownership проверяются на Backend.
- Контекст использует последний завершённый анализ, report, findings и recommendations,
  ограничивается token budget и кэшируется до смены анализа.
- Секреты фильтруются перед передачей модели; context и сообщения не пишутся в логи.
- Запрос идёт через `chat.queue`; Worker `ChatProcessor` повторно использует существующий
  `AIService` и OmniRouter/DeepSeek provider. Отдельной AI-реализации нет.
- Ошибки missing analysis, provider failure и timeout имеют явные HTTP-коды.
- Повтор с одинаковым `Idempotency-Key` переиспользует сохранённый user/assistant lifecycle;
  deterministic UUID job id остаётся стабильным после перезапуска API.

## Проверки

- API Chat unit/integration tests и отдельные Worker unit tests проходят в целевом наборе.
- Database-backed API → Redis → Worker → AI → PostgreSQL acceptance должен выполняться отдельно
  при поднятой инфраструктуре; mock-тесты сами по себе не переводят этап в COMPLETE.

Stage 11.2 добавляет Redis context cache, related-context ranking, memory/summary, searchable
history, SSE и persisted `ChatUsage`.
