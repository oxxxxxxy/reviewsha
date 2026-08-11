# Reviewsha

Reviewsha — monorepo-платформа для автоматического code review с проектами,
analysis pipeline, reports и AI Chat.

## Возможности

- JWT authentication, refresh sessions и RBAC;
- projects, tags, history и ownership-aware API;
- ZIP upload/versioning через MinIO;
- асинхронный analysis pipeline на BullMQ/Redis и отдельном Worker;
- AI context/chunks, structured reports, Markdown/PDF/JSON exports;
- chat history, bounded context и typed SSE streaming;
- Web и Admin React applications;
- OpenAPI → generated SDK contract;
- Docker/Compose development и Helm/Kubernetes deployment.

## Архитектура

```text
Web / Admin
    ↓
Generated SDK + typed stream client
    ↓
NestJS API ─── PostgreSQL
    │  ├─────── Redis/BullMQ ─── Worker ─── AI provider
    └────────── MinIO/S3
```

Подробности: [architecture overview](docs/architecture/overview.md) и
[project structure](docs/architecture/project-structure.md).

## Быстрый запуск

Требования: Node.js 24.x, Corepack/Yarn 1.22.22, Docker Compose v2.

```bash
git clone https://github.com/oxxxxxxy/reviewsha.git
cd reviewsha
corepack enable
corepack prepare yarn@1.22.22 --activate
yarn install --immutable --non-interactive
cp .env.example .env
docker compose up -d postgres redis minio minio-create-buckets
yarn workspace @reviewsha/api prisma:migrate
yarn workspace @reviewsha/api prisma:seed
yarn dev
```

Сервисы:

- Web: `http://localhost:5173`
- Admin: `http://localhost:5174`
- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/v1/docs`
- MinIO Console: `http://localhost:9001`

Полная инструкция и troubleshooting находятся в
[Getting Started](docs/getting-started/installation.md).

## Репозиторий

```text
apps/api       NestJS API, Prisma, Swagger
apps/web       пользовательский React app
apps/admin     административный React app
apps/worker    BullMQ processors и AI/report jobs
packages/sdk   generated API types и typed client
packages/ui    общий UI Kit
packages/types/config shared domain/config helpers
docs/           developer, architecture, API и deployment docs
helm/           canonical Helm chart
infrastructure/ Compose и supporting assets
```

## Разработка и тесты

```bash
yarn dev
yarn lint
yarn typecheck
yarn format:check --ignore-unknown
yarn test
yarn ci:openapi
yarn docs:check
yarn test:e2e:install
yarn test:e2e
```

Stage-specific проверки находятся в `package.json`, например
`yarn ci:stage11` … `yarn ci:stage14`. Перед PR прочитайте
[CONTRIBUTING.md](CONTRIBUTING.md) и [testing guide](docs/development/testing.md).

## API и SDK

- runtime Swagger UI: `/api/v1/docs`;
- runtime OpenAPI JSON: `/api/v1/docs-json`;
- generated artifact: `docs/generated/openapi.json`;
- generated SDK types: `packages/sdk/src/generated/openapi.ts`.

```bash
yarn docs:openapi
yarn openapi:validate
yarn sdk:check
```

См. [API/OpenAPI guide](docs/api/openapi.md).

## Deployment

- [Docker](docs/deployment/docker.md)
- [Kubernetes](docs/deployment/kubernetes.md)
- [Helm](docs/deployment/helm.md)
- [Production procedure](docs/deployment/production.md)
- [Rollback](docs/deployment/rollback.md)
- [Production checklist](docs/deployment/checklist.md)

## Текущий implementation baseline

Этапы 1–19 считаются реализованными на уровне текущего code/automated-CI
baseline. Основной локальный browser/API QA-проход выполнен и зафиксирован в
[manual UX audit](docs/qa/manual-ux-audit-2026-08-11.md); production visual,
accessibility и deployment checks остаются отдельными проверками.

## Документация

Начните с [docs index](docs/README.md). Документы сгруппированы по Getting
Started, development, architecture, backend/frontend, API и deployment.

## Contributing

Изменения должны включать тесты и документацию для затронутых contracts. См.
[CONTRIBUTING.md](CONTRIBUTING.md).
