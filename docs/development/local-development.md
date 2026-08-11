# Локальная разработка

## Команды

```bash
yarn dev                 # API, Web, Admin, Worker, OmniRouter
yarn build              # packages и apps
yarn lint
yarn typecheck
yarn format:check --ignore-unknown
yarn test
yarn docs:check
```

Запускайте инфраструктуру отдельным Compose profile/набором сервисов, как
описано в [installation](../getting-started/installation.md). Не запускайте
одновременно контейнерный и host Worker на одной локальной очереди без
необходимости.

## Типичный цикл изменения

1. Изучить существующий module/contract и документацию.
2. Создать branch от актуального `main`.
3. Изменить code + tests + OpenAPI/docs в одном PR.
4. Запустить targeted tests, затем `yarn ci:quality` и relevant stage CI.
5. Проверить generated SDK drift (`yarn ci:openapi`).
6. Проверить `git diff --check` и рабочее дерево.
7. Открыть GitHub PR с описанием migration/env/deployment impact.

## Полезные команды

```bash
yarn workspace @reviewsha/api prisma:studio
yarn workspace @reviewsha/api prisma:migrate:status
yarn workspace @reviewsha/api prisma:format
yarn workspace @reviewsha/api prisma:validate
yarn workspace @reviewsha/sdk test
yarn workspace @reviewsha/web test
yarn workspace @reviewsha/admin test
```

Изменения схемы сначала проверяйте на disposable/local database. Не выполняйте
reset production database.
