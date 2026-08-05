# Stage 7.1 — Queue Infrastructure

**Status: ✅ COMPLETE**

## Реализовано

- API `QueueModule` на `@nestjs/bullmq` и BullMQ.
- Централизованный `QueueRegistry` с очередями `scan.queue`, `file.queue`,
  `ai.queue`, `report.queue`, `notification.queue` и `dead-letter.queue`.
- `QueueService` для создания, поиска, удаления, retry, pause/resume и health check.
- Единый Job envelope: `id`, `type`, `payload`, `createdAt`.
- Запрет бинарных данных, секретов и чрезмерно больших payload.
- Общая retry policy: 3 попытки, exponential backoff, удаление completed jobs и
  сохранение failed jobs.
- Redis configuration через `REDIS_URL` или host/port/password/db параметры.
- Health endpoint проверяет PostgreSQL, Redis и MinIO.
- Worker использует ту же retry policy и централизованные имена очередей.
- CI job `stage7-tests` и локальная команда `yarn test:stage7` с Redis в Docker.

## Проверки

```text
19 Queue unit tests ✅
11 BullMQ/Redis integration tests ✅
yarn ci:local ✅
```

Оркестрация `UploadCompleted` и последовательность Extract → Parse → Analyze →
Merge → Report → Notify реализованы на Stage 7.2; реальные Worker processors
появятся на Stage 8.
