# Первый запуск и smoke-check

После [установки](installation.md) выполните следующие проверки.

## Infrastructure

```bash
docker compose ps
curl -fsS http://localhost:9000/minio/health/live
redis-cli -h localhost ping
```

PostgreSQL должен отвечать на `pg_isready`:

```bash
pg_isready -h localhost -p 5432 -U reviewsha -d reviewsha
```

## API

```bash
curl -fsS http://localhost:3000/api/v1/health
curl -fsS http://localhost:3000/api/v1/docs-json > /tmp/reviewsha-openapi.json
```

Ожидается HTTP 200. OpenAPI также можно открыть в Swagger UI.

## Frontend

Откройте `http://localhost:5173` и `http://localhost:5174`. В development
Vite dev server должен отдавать application shell, а API URL должен указывать
на `http://localhost:3000/api/v1`.

## Functional smoke flow

1. Зарегистрируйте пользователя.
2. Войдите и проверьте refresh/logout.
3. Создайте проект.
4. Загрузите небольшой допустимый ZIP.
5. Запустите analysis и проверьте состояние pipeline.
6. Откройте report и экспорт.
7. Откройте Chat и проверьте REST/SSE flow.
8. Для Admin войдите пользователем с ролью `ADMIN` и проверьте users/projects.

Реальный provider, browser accessibility и production-like E2E являются
отдельным QA-проходом; локальный smoke-check не заменяет их.
