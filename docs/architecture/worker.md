# Worker architecture

Worker запускается как отдельный NestJS application context без HTTP server.
BullMQ получает job из Redis, processor выполняет работу и обновляет состояние
в PostgreSQL/MinIO.

```text
QueueService.addJob
      ↓
Redis/BullMQ
      ↓
Worker processor
      ├── load identifiers
      ├── fetch object / project state
      ├── process idempotently
      ├── persist result/progress
      └── enqueue next step
```

## Pipeline steps

Фактический pipeline использует upload/download/extract/parse/merge/analyze/
report/notify/cleanup boundaries. Имена queue/job types являются частью
внутреннего contract; payload должен содержать identifiers, а не большие
архивы или полные секретные prompt.

## Reliability

- jobs идемпотентны и могут быть повторены;
- transient provider/network errors retry-ятся с backoff;
- permanent/exhausted failures фиксируются как failed/dead-letter;
- progress и terminal status сохраняются в DB;
- cancellation проверяется до следующего terminal transition;
- Worker не должен логировать содержимое секретов или полный prompt.

## Local debugging

```bash
yarn workspace @reviewsha/worker dev
yarn workspace @reviewsha/worker test
```

Проверяйте Redis, queue name, job id, attempts и связанный `scanId`/`projectId`.
Для admin queue monitoring используйте API, а не подключайтесь к Redis из
браузера.
