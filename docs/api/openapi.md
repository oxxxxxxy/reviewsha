# API и OpenAPI

API versioned base URL: `http://localhost:3000/api/v1`.

- Swagger UI: `/docs`
- OpenAPI JSON: `/docs-json`
- generated repository artifact: `docs/generated/openapi.json`
- generated SDK types: `packages/sdk/src/generated/openapi.ts`

## Contract pipeline

```text
NestJS DTO + decorators
  → docs:openapi
  → docs/generated/openapi.json
  → openapi-typescript
  → packages/sdk/src/generated/openapi.ts
  → Web/Admin
```

Команды:

```bash
yarn docs:openapi
yarn openapi:validate
yarn sdk:check
yarn ci:openapi
```

`yarn sdk:check` завершается ошибкой, если generated SDK drift-ит от OpenAPI.

## Endpoint groups

Auth, users, sessions, projects, uploads, analyses/pipelines, reports, chat и
admin endpoints документируются прямо в Swagger. Auth requirements, DTO,
response schemas и error responses должны обновляться вместе с Controller.

## Errors

Используйте общий envelope `ApiErrorResponseDto` (status/code/message/requestId,
если поле доступно). Не создавайте feature-specific untyped `any` response без
явного contract decision.

## Streaming

`POST /chat/{sessionId}/stream` имеет `text/event-stream` response. Typed event
shape поддерживается SDK streaming client. Не моделируйте SSE как обычный JSON
endpoint и не парсите arbitrary text в компоненте.
