# Stage 7.2 — Job Pipeline

> **Historical implementation note.** This document records an earlier plan or execution checkpoint. It is retained for traceability; current behavior is defined by code and the canonical docs index.

## Реализовано

`apps/api/src/modules/pipeline` содержит `PipelineModule`, `PipelineService`,
централизованные типы шагов и `PipelineEvents`.

Поток:

```text
upload.completed → extract → parse → analyze → merge → report → notify
```

Состояние сохраняется в существующей модели `Scan`, а `sourceFileId` обеспечивает
идемпотентность повторных `UploadCompleted` событий.

## Retry и Dead Letter

Временные ошибки (`REDIS_TIMEOUT`, `MINIO_UNAVAILABLE`, `AI_TIMEOUT`,
`NETWORK_ERROR`) повторяются до трёх попыток. Постоянные ошибки и исчерпанные
попытки переводят pipeline в `FAILED` и создают identifier-only job в
`dead-letter.queue`.

## Worker contract

`handleSuccess`, `handleFailure`, `resumePipeline` и `cancelPipeline` являются
контрактом между orchestration API и Worker. Реальные обработчики шагов появятся
на Stage 8. Проверки: `yarn workspace @reviewsha/api test:stage7` и `yarn ci:local`.

Состояние pipeline хранится в `Scan.pipelineStep`, `Scan.pipelineStatus`,
`pipelineAttempts`, error-полях и timestamp-полях. Для владельца и администратора
доступны `GET /api/v1/pipelines/:id`, `POST /api/v1/pipelines/:id/resume` и
`POST /api/v1/pipelines/:id/cancel`. Метрики очередей и pipeline подготовлены
для Admin Panel.

HTTP-интеграционные тесты pipeline проверяют API статуса, прогресс, resume,
cancel, ownership handoff и отсутствие чувствительных полей; они являются API
E2E-аналогом до появления полноценного Worker в Stage 8.
