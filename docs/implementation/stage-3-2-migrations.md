# Этап 3.2 — Миграции

**Статус:** ✅ COMPLETE

## Цель

Настроена полноценная инфраструктура управления изменениями PostgreSQL-схемы через Prisma Migrate.

На этапе 3.2 новые сущности не добавлялись. Работа выполнена вокруг процесса: scripts, CI, tests, документация и правила разработки.

---

## Структура

Используется стандартная структура Prisma Migrate:

```txt
apps/api/prisma/
├── schema.prisma
├── migrations/
│   ├── 20260801115902_init_schema/
│   │   └── migration.sql
│   └── migration_lock.toml
└── seed.ts
```

---

## API scripts

В `apps/api/package.json` настроены команды:

```bash
yarn workspace @reviewsha/api prisma:format
yarn workspace @reviewsha/api prisma:validate
yarn workspace @reviewsha/api prisma:generate
yarn workspace @reviewsha/api prisma:migrate
yarn workspace @reviewsha/api prisma:deploy
yarn workspace @reviewsha/api prisma:reset
yarn workspace @reviewsha/api prisma:reset:schema
yarn workspace @reviewsha/api prisma:migrate:status
yarn workspace @reviewsha/api prisma:studio
yarn workspace @reviewsha/api prisma:seed
```

`prisma:reset` выполняет schema reset и затем seed, чтобы локальная/test база после сброса была полностью восстановлена.

---

## Development workflow

```txt
Изменение schema.prisma
↓
prisma format
↓
prisma validate
↓
prisma migrate dev
↓
prisma generate
↓
обновление seed при необходимости
↓
обновление docs/architecture/04-database.md и database.drawio при изменении структуры
↓
yarn test:stage3
↓
commit
```

---

## Production workflow

Production применяет только уже созданные миграции:

```bash
yarn workspace @reviewsha/api prisma:deploy
```

`prisma db push` запрещён для production и shared environments.

---

## Naming convention

Разрешённые примеры:

```txt
initial_schema
add_refresh_tokens
add_ai_chat
add_report_score
rename_scan_status
add_indexes
```

Запрещённые примеры:

```txt
migration1
fix
update
test
```

---

## CI integration

GitHub Actions выполняет Stage 3 Prisma migration tests:

```bash
yarn test:stage3
```

Проверки включают `format`, `validate`, `generate`, `migrate dev`, `migrate deploy`, повторный `deploy`, `reset`, seed и Prisma Client CRUD.

---

## Автоматические тесты

`tests/stage3/prisma.integration.test.ts` содержит infrastructure/acceptance tests для миграций и seed. Блок миграций покрывает:

1. `prisma format`.
2. `prisma validate`.
3. `prisma generate`.
4. Проверка структуры `prisma/migrations` и `migration_lock.toml`.
5. `prisma migrate dev` на пустой local DB.
6. `prisma migrate deploy` на чистой DB.
7. Повторный `prisma migrate deploy` без pending migrations.
8. `prisma reset` с последующим seed.
9. Идемпотентный seed без дублирования critical records.
10. Prisma Client connection.
11. CRUD для `User` после применения миграций.

Дополнительные проверки Stage 3.3 покрывают детерминированные seed users, projects, relations, findings, chats и queue jobs.

---

## Definition of Done

Этап 3.2 завершён, потому что:

- Prisma Migrate структура версионируется;
- scripts покрывают development, production, reset, studio и seed workflows;
- reset полностью восстанавливает структуру и dev-данные;
- CI запускает migration acceptance tests;
- документация описывает правила создания, именования, применения и проверки миграций.
