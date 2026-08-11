# Структура monorepo

```text
apps/
  api/       NestJS HTTP API, Prisma и Swagger
  web/       пользовательский React/Vite application
  admin/     административный React/Vite application
  worker/    NestJS application context + BullMQ processors
packages/
  config/    shared constants и env helpers
  types/     общие domain/API types без бизнес-логики
  sdk/       generated OpenAPI types и typed client services
  ui/        общий React UI Kit и design tokens
docs/        developer, architecture, API и deployment docs
infrastructure/docker/  compose variants и init assets
k8s/         Kubernetes examples
helm/        canonical Helm chart
scripts/     validation и deployment scripts
.github/     CI, release placeholder и contribution templates
```

## Правила ownership

| Путь | Ответственность | Не помещать сюда |
| --- | --- | --- |
| `apps/api/src/modules` | API controllers, services, repositories, DTO | React, worker-only processing |
| `apps/api/prisma` | schema, migrations, seed | ручные runtime SQL-скрипты без причины |
| `apps/worker/src` | processors, queue consumers, AI/report jobs | HTTP controllers |
| `apps/web/src` | user UI и query layer | отдельный axios/fetch в component |
| `apps/admin/src` | admin UI и admin query layer | прямой Redis/BullMQ доступ |
| `packages/sdk/src/generated` | generator output | ручные изменения |
| `packages/ui/src` | reusable UI | feature-specific API calls |
| `docs/implementation` | исторические execution notes и audits | новая canonical architecture без ссылки |

Новый endpoint обычно изменяет API DTO/controller → OpenAPI → SDK → query layer
→ UI. Новую очередь изменяют в shared queue contract, API/Worker boundaries и
соответствующей документации.
