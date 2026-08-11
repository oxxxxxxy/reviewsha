# Database и Prisma

PostgreSQL — источник истины. Prisma schema находится в
`apps/api/prisma/schema.prisma`, migrations — в `apps/api/prisma/migrations/`.

## Development

```bash
yarn workspace @reviewsha/api prisma:format
yarn workspace @reviewsha/api prisma:validate
yarn workspace @reviewsha/api prisma:generate
yarn workspace @reviewsha/api prisma:migrate
yarn workspace @reviewsha/api prisma:seed
yarn workspace @reviewsha/api prisma:studio
```

`prisma:migrate` создаёт development migration. Для существующей среды применяйте:

```bash
yarn workspace @reviewsha/api prisma:deploy
```

`prisma:reset` уничтожает локальные данные и допустим только для development.

## Repository layer

Controllers не должны обращаться к Prisma Client напрямую. Repository отвечает
за query shape, ownership filters, pagination и persistence; service отвечает за
business rules и domain errors.

## Основные entities

`User` и `Session` отвечают за identity/auth. `Project` связан с uploads, scans,
reports, chat, members, tags и history. `AIRequest`/`AIUsage` сохраняют provider
telemetry. Queue state и audit/log data имеют отдельные модели.

## Индексы и миграции

При добавлении list/filter endpoint проверьте индекс по foreign key, status и
createdAt. Migration должна быть backward-compatible с rolling deployment или
явно включать согласованный migration window. Seed не является production data
migration.

## Backup и rollback

Перед production migration нужен проверенный PostgreSQL backup. Prisma migration
не откатывается автоматически удалением SQL; для rollback применяйте forward
migration или восстановление backup согласно [rollback guide](../deployment/rollback.md).
