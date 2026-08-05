# Stage 8.1 — Worker Infrastructure

## Реализовано

- standalone `apps/worker` на Nest application context без HTTP-слоя;
- Redis/BullMQ queue consumers с общей конфигурацией и retry policy;
- `WorkerDatabaseService` на Prisma + `PrismaPg`;
- `WorkerStorageService` на MinIO adapter;
- `FilesystemService`, `TempStorageService`, `CleanupService` и изолированные
  job workspaces;
- `JobHandler` contract и `ProcessorRegistry` для extract/parse/analyze/merge/
  report/notify;
- `WorkerHealthService` для Redis, PostgreSQL и MinIO;
- graceful shutdown по SIGINT/SIGTERM;
- Compose service и отдельный `apps/worker/Dockerfile`.

Реальные операции обработки архива намеренно находятся на следующем Stage 8.2.

## Проверки

```text
54 Worker unit tests ✅
yarn workspace @reviewsha/worker build ✅
yarn workspace @reviewsha/worker typecheck ✅
yarn workspace @reviewsha/worker lint ✅
docker build -f apps/worker/Dockerfile . ✅
```
