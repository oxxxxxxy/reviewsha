# Этап 3.1 — Prisma Schema

**Статус:** ✅ COMPLETE

## Цель

Создана полная Prisma-схема PostgreSQL для MVP проекта «Ревьюша» без реализации сервисов, контроллеров и публичных API endpoints.

Схема синхронизирована с:

- `docs/architecture/04-database.md`;
- ER-диаграммой `docs/architecture/diagrams/database.drawio`;
- Stage 3.1 Definition of Done.

---

## Артефакты

```txt
apps/api/prisma/
├── schema.prisma
├── migrations/20260801115902_init_schema/migration.sql
└── seed.ts
```

---

## Реализованные модели

Основные доменные модели:

- `User`
- `Session`
- `Organization`
- `Project`
- `ProjectMember`
- `UploadedFile`
- `Scan`
- `ScanStep`
- `Report`
- `Finding`
- `AIRequest`
- `ChatSession`
- `ChatMessage`
- `Notification`
- `Invitation`

Технические модели:

- `QueueJob` — журнал выполнения BullMQ jobs;
- `RefreshToken` — отдельное хранилище refresh token для поддержки нескольких устройств и будущей auth-логики.

---

## Реализованные enum

- `Role`
- `ProjectRole`
- `ProjectStatus`
- `Visibility`
- `ScanStatus`
- `ScanStepType`
- `ScanStepStatus`
- `Severity`
- `FindingCategory`
- `FindingStatus`
- `ReportFormat`
- `AIRequestStatus`
- `QueueStatus`
- `QueueType`
- `MessageRole`
- `NotificationType`
- `InvitationStatus`

---

## Связи

Схема описывает связи из архитектуры:

```txt
User 1 ── N Session
User 1 ── N Project
User N ── M Project через ProjectMember
User 1 ── N UploadedFile
User 1 ── N Scan
User 1 ── N ChatSession
User 1 ── N ChatMessage
User 1 ── N Notification

Organization 1 ── N Project
Organization 1 ── N Invitation

Project 1 ── N UploadedFile
Project 1 ── N Scan
Project 1 ── N ProjectMember
Project 1 ── N Report

UploadedFile 1 ── N Scan через Scan.sourceFileId
UploadedFile 1 ── N Finding через Finding.fileId

Scan 1 ── 1 Report
Scan 1 ── N ScanStep
Scan 1 ── N Finding
Scan 1 ── N AIRequest
Scan 1 ── N QueueJob

Report 1 ── N Finding
Report 1 ── N ChatSession

Finding 1 ── N AIRequest
ChatSession 1 ── N ChatMessage
```

---

## Delete policy

MVP использует soft delete для пользовательских сущностей:

- `User.deletedAt`
- `Organization.deletedAt`
- `Project.deletedAt`
- `UploadedFile.deletedAt`
- `Scan.deletedAt`
- `Report.deletedAt`

Foreign keys настроены явно:

- `Cascade` для сущностей, которые не должны оставаться без владельца;
- `SetNull` для исторических и диагностических связей, которые можно сохранить после удаления контекста;
- `Cascade` on update для синхронного обновления ключей.

---

## Seed

`apps/api/prisma/seed.ts` идемпотентен.

Создаёт:

- администратора `admin@reviewsha.local`;
- пользователя `user@reviewsha.local`;
- session и refresh token;
- demo organization;
- invitation;
- demo project;
- project membership;
- uploaded file metadata;
- completed scan;
- completed scan step;
- report;
- finding;
- AI request;
- chat session;
- chat message;
- notification;
- queue job.

---

## Команды проверки

```bash
docker compose up -d postgres

yarn workspace @reviewsha/api prisma:format
yarn workspace @reviewsha/api prisma:validate
yarn workspace @reviewsha/api prisma:generate
yarn workspace @reviewsha/api prisma:migrate
yarn workspace @reviewsha/api prisma:deploy
yarn workspace @reviewsha/api prisma:seed

yarn workspace @reviewsha/api test:prisma
yarn test:stage3
```

---

## Автоматические тесты

Добавлены 8 Stage 3 acceptance tests в `tests/stage3/prisma.integration.test.ts`:

1. Prisma schema validate.
2. Prisma schema format.
3. Prisma Client generate.
4. Наличие первой migration под version control.
5. Применение migration к пустой PostgreSQL DB.
6. Идемпотентный запуск seed.
7. Подключение к PostgreSQL через Prisma Client.
8. CRUD для модели `User`.

Дополнительно добавлены unit contract tests схемы в `apps/api/tests/unit/prisma/schema.test.ts`.

---

## Definition of Done

Этап 3.1 завершён, потому что:

- все MVP-сущности описаны в Prisma;
- все enum, индексы, unique constraints и foreign keys реализованы;
- первая migration создана и применяется к пустой базе;
- Prisma Client генерируется;
- seed выполняется многократно без дублирования критичных записей;
- документация обновлена;
- CI включает Stage 3 Prisma acceptance tests.
