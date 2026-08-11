# Этап 3 — финальный аудит базы данных и Prisma

> **Historical implementation note.** This document records an earlier plan or execution checkpoint. It is retained for traceability; current behavior is defined by code and the canonical docs index.

**Статус:** ✅ COMPLETE

## Состав этапа

- 3.1 Prisma Schema — полная схема MVP и первая миграция.
- 3.2 Миграции — Prisma Migrate workflow, reset/deploy/status scripts, CI checks.
- 3.3 Seed — модульный deterministic seed.
- 3.4 Prisma Client — `PrismaService`, `DatabaseModule`, health check, транзакции.
- 3.5 Repository Layer — репозитории для всех основных сущностей.

## Acceptance coverage

Автоматические проверки включают:

- Prisma format/validate/generate;
- migrate dev/deploy/reset;
- idempotent seed;
- PostgreSQL connectivity;
- PrismaService lifecycle and transactions;
- repository unit tests with mocked PrismaService;
- CI-safe PostgreSQL readiness checks before destructive migration test setup;
- relation checks User → Project → Scan → Report → Finding;
- cascade policy checks through Stage 3 integration database.

## Правила перед Stage 4

- Новые backend сервисы используют только Repository Layer.
- Новые изменения схемы идут только через новую Prisma migration.
- Seed остаётся детерминированным и идемпотентным.
- API response/error contract остаётся `{ data, meta }` и `{ error: { code, message } }` согласно `docs/architecture/11-api-contracts.md`.
