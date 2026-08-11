# `@reviewsha/worker`

Standalone NestJS application context и BullMQ processors. Worker не поднимает
HTTP API и выполняет длительные file, analysis, AI, report и notification jobs.

## Запуск

```bash
cp apps/worker/.env.example apps/worker/.env
yarn workspace @reviewsha/worker dev
```

Для удалённого provider задайте `OMNIROUTER_API_KEY`; для deterministic local
checks используйте `AI_PROVIDER=mock`.

## Проверки

```bash
yarn workspace @reviewsha/worker lint
yarn workspace @reviewsha/worker typecheck
yarn workspace @reviewsha/worker test
yarn workspace @reviewsha/worker build
```

Worker/queue design описаны в [worker architecture](../../docs/architecture/worker.md)
и [queues guide](../../docs/development/queues.md).
