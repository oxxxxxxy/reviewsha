# Stage 11.1 — Chat Module

Статус: **COMPLETE**.

## Реализация

- NestJS `ChatModule`: controller, services, repository, DTO и Swagger.
- `ChatSession` и `ChatMessage` сохраняются в PostgreSQL; сообщения содержат token count и
  идемпотентный `requestId`.
- API: создание/список сессий, пагинированная история и отправка сообщения.
- JWT, project ownership и session ownership проверяются на Backend.
- Контекст использует последний завершённый анализ, report, findings и recommendations,
  ограничивается token budget и кэшируется до смены анализа.
- Секреты фильтруются перед передачей модели; context и сообщения не пишутся в логи.
- Запрос идёт через `chat.queue`; Worker `ChatProcessor` повторно использует существующий
  `AIService` и OmniRouter/DeepSeek provider. Отдельной AI-реализации нет.
- Ошибки missing analysis, provider failure и timeout имеют явные HTTP-коды.

## Проверки

- 83+ API unit tests и отдельные Worker unit tests.
- 27 HTTP integration tests.
- 10+ реальных E2E chat-сценариев включены в полный API → Redis → Worker → AI → PostgreSQL flow.

Stage 11.2 добавляет Redis context cache, related-context ranking, memory/summary, searchable
history, SSE и persisted `ChatUsage`.
