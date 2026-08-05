# Stage 7.2 — Job Pipeline

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
