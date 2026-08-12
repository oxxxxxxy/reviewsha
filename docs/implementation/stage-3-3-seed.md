# Этап 3.3 — Seed

> **Historical implementation note.** This document records an earlier plan or execution checkpoint. It is retained for traceability; current behavior is defined by code and the canonical docs index.

**Статус:** ✅ COMPLETE

## Цель

Создана полноценная система начального заполнения PostgreSQL базы для локальной разработки, тестирования, демо и автоматических проверок.

Seed детерминированный: данные не случайные, используют стабильные IDs, email, object keys и predictable values.

---

## Структура

```txt
apps/api/prisma/
├── seed.ts
└── seeds/
    ├── users.seed.ts
    ├── projects.seed.ts
    ├── uploads.seed.ts
    ├── scans.seed.ts
    ├── reports.seed.ts
    ├── findings.seed.ts
    ├── chats.seed.ts
    ├── queue-jobs.seed.ts
    ├── constants.ts
    ├── types.ts
    └── index.ts
```

`seed.ts` содержит только bootstrap: Prisma Client, запуск `runSeeds`, лог результата и закрытие соединения.

---

## Данные

Пользователи:

- `admin@reviewsha.local` — `ADMIN`, пароль `admin-password`;
- `developer@reviewsha.local` — `USER`, пароль `developer-password`;
- `demo@reviewsha.local` — `USER`, пароль `demo-password`.

Пароли seed-пользователей хранятся в совместимом с `AuthService` формате Argon2id.
После изменения seed-данных выполните `yarn workspace @reviewsha/api prisma:seed`.

Проекты:

- `NestJS API`;
- `React Dashboard`;
- `Linux Scripts`.

Связанные сущности:

- `Session`;
- `RefreshToken`;
- `Organization`;
- `Invitation`;
- `ProjectMember`;
- `UploadedFile`;
- `Scan` со статусами `COMPLETED`, `ANALYZING`, `FAILED`;
- `ScanStep`;
- `Report` для completed scan;
- 24 `Finding` с разными `Severity` и `FindingCategory`;
- `AIRequest` для findings;
- `ChatSession` и 4 `ChatMessage`;
- 4 `QueueJob` со статусами `WAITING`, `ACTIVE`, `COMPLETED`, `FAILED`.

---

## Идемпотентность

Seed безопасен при повторном запуске:

- все критичные записи создаются через `upsert`;
- используются deterministic IDs и unique keys;
- повторный запуск обновляет записи, а не дублирует их;
- foreign keys проверяются через Prisma relations.

---

## Команды

```bash
yarn workspace @reviewsha/api prisma:seed
yarn workspace @reviewsha/api prisma:reset
```

`prisma:reset` выполняет reset schema и затем explicit seed step.

---

## Автоматические тесты

`tests/stage3/prisma.integration.test.ts` проверяет seed acceptance criteria:

1. Выполнение `prisma:seed`.
2. Повторное выполнение `prisma:seed` без дубликатов.
3. Выполнение `prisma:reset` с seed.
4. Создание администратора.
5. Создание проектов.
6. Связи `User → Project`.
7. Связи `Project → Scan → Report`.
8. Минимальный ожидаемый набор записей.
9. Наличие uploaded files, findings, chats и queue jobs для UI-разработки.

---

## Definition of Done

Этап 3.3 завершён, потому что:

- seed разделён по модулям;
- seed запускается одной командой;
- seed идемпотентен;
- после reset база получает полный демонстрационный набор данных;
- данные реалистичны и покрывают основные MVP-сценарии;
- документация и README обновлены;
- автоматические тесты проходят.
