# Этап 2.4. Docker Compose — Definition of Done

> **Historical implementation note.** This document records an earlier plan or execution checkpoint. It is retained for traceability; current behavior is defined by code and the canonical docs index.

Статус: ✅ COMPLETE

## Цель

Создать локальное инфраструктурное окружение разработки, которое запускает PostgreSQL, Redis и MinIO одной командой без контейнеризации приложений `api`, `web`, `admin` и `worker`.

## Файлы

```txt
docker-compose.yml
infrastructure/docker/
├── docker-compose.yml
├── .env.example
├── postgres/
│   ├── init/
│   │   └── 001-init.sql
│   └── data/.gitkeep
├── redis/.gitkeep
└── minio/
    └── data/.gitkeep
```

Root `docker-compose.yml` добавлен как удобный entrypoint, чтобы из корня проекта работала команда:

```bash
docker compose up -d
```

`infrastructure/docker/docker-compose.yml` хранит инфраструктурную конфигурацию в архитектурной директории этапа.

## Сервисы

### PostgreSQL

- image: `postgres:17-alpine`;
- container: `reviewsha-postgres`;
- port: `${POSTGRES_PORT:-5432}`;
- database: `${POSTGRES_DB:-reviewsha}`;
- user: `${POSTGRES_USER:-reviewsha}`;
- password: `${POSTGRES_PASSWORD:-reviewsha}`;
- named volume: `reviewsha_postgres_data`;
- init script: `postgres/init/001-init.sql`;
- healthcheck: `pg_isready`.

### Redis

- image: `redis:7-alpine`;
- container: `reviewsha-redis`;
- port: `${REDIS_PORT:-6379}`;
- MVP persistence: disabled;
- healthcheck: `redis-cli ping`.

### MinIO

- image: `minio/minio:latest`;
- container: `reviewsha-minio`;
- API port: `${MINIO_API_PORT:-9000}`;
- Console port: `${MINIO_CONSOLE_PORT:-9001}`;
- root user: `${MINIO_ROOT_USER:-reviewsha}`;
- root password: `${MINIO_ROOT_PASSWORD:-reviewsha-password}`;
- named volume: `reviewsha_minio_data`;
- healthcheck: `mc ready local`.

### MinIO bucket init

Создан отдельный one-shot service:

```txt
minio-create-buckets
```

Он создаёт buckets:

```txt
projects
reports
temp
exports
avatars
```

## Network

Все сервисы подключены к общей bridge network:

```txt
reviewsha_network
```

Внутри Docker network сервисы доступны по именам:

```txt
postgres
redis
minio
```

Для локально запущенных приложений доступны host endpoints:

```txt
PostgreSQL: localhost:5432
Redis:      localhost:6379
MinIO API:  localhost:9000
MinIO UI:   localhost:9001
```

## Проверки

Выполнены проверки:

```bash
docker compose config
docker compose up -d
docker compose ps
docker compose logs --tail=100
docker compose exec -T postgres pg_isready -U reviewsha -d reviewsha
docker compose exec -T postgres psql -U reviewsha -d reviewsha -c "SELECT 1;"
docker compose exec -T redis redis-cli ping
docker compose exec -T minio mc ready local
docker compose exec -T minio mc alias set reviewsha-local http://localhost:9000 reviewsha reviewsha-password
docker compose exec -T minio mc ls reviewsha-local
docker compose down
```

Также продолжают проходить проектные проверки:

```bash
yarn lint
yarn typecheck
yarn test
yarn build
yarn format:check --ignore-unknown
```

## Definition of Done

- ✅ создан `docker-compose.yml`;
- ✅ создан `infrastructure/docker/docker-compose.yml`;
- ✅ создан `infrastructure/docker/.env.example`;
- ✅ PostgreSQL запускается и проходит healthcheck;
- ✅ Redis запускается и проходит healthcheck;
- ✅ MinIO запускается и проходит healthcheck;
- ✅ созданы named volumes `reviewsha_postgres_data`, `reviewsha_minio_data`;
- ✅ все сервисы находятся в общей Docker network `reviewsha_network`;
- ✅ приложения могут подключаться через localhost при локальном запуске и через service names внутри Docker network;
- ✅ подготовлены buckets `projects`, `reports`, `temp`, `exports`, `avatars`;
- ✅ README обновлён;
- ✅ локальная инфраструктура готова к следующему этапу разработки.
