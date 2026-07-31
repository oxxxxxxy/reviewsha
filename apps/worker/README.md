# @reviewsha/worker

Standalone NestJS/BullMQ Worker приложения «Ревьюша».

## Назначение

Worker выполняет длительные асинхронные задачи. Он не поднимает HTTP API и не взаимодействует с пользователем напрямую.

На Этапе 2 реализован queue/worker skeleton без бизнес-логики анализа.

## Запуск

```bash
yarn workspace @reviewsha/worker dev
```

## Проверки

```bash
yarn workspace @reviewsha/worker lint
yarn workspace @reviewsha/worker typecheck
yarn workspace @reviewsha/worker test
yarn workspace @reviewsha/worker build
```

## ENV

Пример:

```txt
apps/worker/.env.example
```

```env
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://reviewsha:reviewsha@localhost:5432/reviewsha?schema=public
MINIO_ENDPOINT=http://localhost:9000
AI_PROVIDER=deepseek
```

## Очереди

```txt
upload
extract
parse
analyze
report
cleanup
```

## Зависимости

- NestJS 11 application context
- BullMQ
- Redis
- Zod
- `@reviewsha/config`
- `@reviewsha/types`
