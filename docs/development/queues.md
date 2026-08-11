# Queues и BullMQ

Redis используется как BullMQ backend. API ставит jobs через QueueService,
Worker регистрирует processors. Browser и Admin не подключаются к Redis напрямую.

## Queue contract

В системе используются queue types для scan/file/AI/report/notification. Точное
имя queue и job payload находятся в shared config/types и processor registry;
изменяйте их синхронно на API и Worker стороне.

Payload должен содержать небольшие identifiers (`projectId`, `uploadId`, `scanId`,
`jobId`) и параметры шага. Архивы, полные prompts и секреты в job payload не
передаются.

## Lifecycle

```text
WAITING → ACTIVE → COMPLETED
                 └→ FAILED/dead-letter
                 └→ CANCELLED
```

Transient failures retry-ятся с backoff; exhausted/permanent failures должны
оставаться диагностируемыми. Processor должен быть идемпотентным: повторная
доставка job не создаёт дубликаты report/message.

## Monitoring

```bash
docker compose logs -f redis
yarn workspace @reviewsha/worker test
yarn test:stage7
yarn test:stage8
```

В production используйте Admin queue endpoints для counts, jobs, attempts,
retry/remove. Перед destructive job action требуется явное подтверждение.

## Новая job

1. Добавьте shared name/payload type.
2. Добавьте producer в service.
3. Добавьте processor и registry entry в Worker.
4. Определите retry/idempotency/terminal behavior.
5. Добавьте unit/integration tests.
6. Обновите [Worker](../architecture/worker.md) и этот документ.
