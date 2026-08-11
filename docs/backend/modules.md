# Backend module guide

## Как добавить feature

1. Определите domain invariant и ownership boundary.
2. Добавьте/измените Prisma model и migration только если это необходимо.
3. Создайте repository contract и implementation.
4. Добавьте service с domain errors и transaction boundaries.
5. Добавьте DTO с validation и Swagger decorators.
6. Добавьте controller без Prisma/AI logic.
7. Подключите module и SDK/OpenAPI.
8. Добавьте unit/integration/security tests.
9. Обновите тематическую документацию.

## Boundaries

- `projects` отвечает за project lifecycle, не за report generation.
- `uploads` отвечает за validation/storage metadata, не за parsing.
- `pipeline` отвечает за scan/pipeline state и job orchestration.
- `reports` отвечает за report retrieval/export/compare.
- `chat` отвечает за conversation/message semantics и context request.
- `admin` использует service/queue/log adapters, а не raw Prisma в Controller.

## Error contract

Новые ошибки должны маппиться в общий `ApiErrorResponseDto` и иметь стабильный
code/status. Swagger responses должны отражать возможные `400/401/403/404/409/422`
и provider/internal failures там, где это применимо.

# GitHub sources

See [GitHub project sources](./github-sources.md) for repository connections,
commit-backed versions, synchronization, and the manual-upload policy.
