# Архитектурный обзор

Reviewsha — monorepo для автоматического code review. Система разделяет
синхронный HTTP API, клиентские приложения, асинхронный Worker и инфраструктуру.

```text
Browser
  ├── Web React
  └── Admin React
          │
          ▼
   Generated SDK / typed stream client
          │
          ▼
       NestJS API
       ├── Auth/RBAC
       ├── Projects/Uploads
       ├── Analysis/Reports
       ├── Chat
       └── Admin operations
          │
   ┌──────┼─────────┐
   ▼      ▼         ▼
PostgreSQL Redis   MinIO
           │
           ▼
        BullMQ
           │
           ▼
         Worker
           │
           ▼
      AI pipeline
           │
           ▼
 OmniRouter / provider
```

## Runtime boundaries

- **API** принимает HTTP-запросы, проверяет auth/ownership, сохраняет состояние
  и ставит jobs.
- **Web** обслуживает пользовательский flow: projects, uploads, analyses,
  reports, chat и settings.
- **Admin** использует те же auth и SDK, но доступен только ролям `ADMIN` и
  `SUPER_ADMIN` на backend.
- **Worker** не слушает HTTP и выполняет длительные jobs через BullMQ.
- **PostgreSQL** — источник истины для пользователей, проектов, uploads,
  scans, reports, chat и usage records.
- **Redis** — broker/cache для BullMQ и chat streaming broker.
- **MinIO** — приватное object storage для project archives и exports.

## Принципы

1. Controller не содержит бизнес-логику.
2. Repository не вызывает AI и не принимает HTTP-решения.
3. API не выполняет тяжёлый parsing/AI синхронно.
4. Web и Admin не создают собственные HTTP-клиенты на feature-уровне.
5. OpenAPI генерируется из backend и является контрактом SDK.
6. Ownership/RBAC проверяются на backend; frontend guard — только UX.
7. Секреты не попадают в логи, browser bundle и API responses.
