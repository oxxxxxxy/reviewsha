# Установка

## Требования

- Node.js 24.x (та же major-версия используется GitHub Actions).
- Corepack и Yarn Classic 1.22.22.
- Docker Engine с Compose v2.
- Git.

Для production также нужны PostgreSQL 17+, Redis 7+, S3-compatible storage
(MinIO в локальной среде), Kubernetes и Helm 3.

## Установка репозитория

```bash
git clone https://github.com/oxxxxxxy/reviewsha.git
cd reviewsha
corepack enable
corepack prepare yarn@1.22.22 --activate
yarn install --immutable --non-interactive
cp .env.example .env
```

Локальные env-файлы приложений при необходимости создаются из шаблонов:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
```

Значения из `.env.example` предназначены только для development. Production
секреты задаются через secret manager или Kubernetes Secret.

## Сервисы разработки

Запустите инфраструктуру без контейнерного Worker, потому что Worker будет
запущен командой `yarn dev`:

```bash
docker compose up -d postgres redis minio minio-create-buckets
```

Примените миграции и, если нужны демонстрационные данные, seed:

```bash
yarn workspace @reviewsha/api prisma:migrate
yarn workspace @reviewsha/api prisma:seed
```

Запустите API, Web, Admin, Worker и OmniRouter:

```bash
yarn dev
```

Порты:

| Компонент | URL |
| --- | --- |
| API | `http://localhost:3000/api/v1` |
| Swagger UI | `http://localhost:3000/api/v1/docs` |
| OpenAPI JSON | `http://localhost:3000/api/v1/docs-json` |
| Web | `http://localhost:5173` |
| Admin | `http://localhost:5174` |
| MinIO API | `http://localhost:9000` |
| MinIO Console | `http://localhost:9001` |
| OmniRouter | `http://localhost:20128` |

Если внешний AI provider не нужен, в `apps/worker/.env` используйте `AI_PROVIDER=mock`.
Для удалённого provider задайте `OMNIROUTER_API_KEY` и соответствующий
`OMNIROUTER_BASE_URL`.

## Остановка

```bash
# остановить процессы yarn dev через Ctrl+C
docker compose down
```

Чтобы удалить локальные volumes PostgreSQL/MinIO:

```bash
docker compose down -v
```
