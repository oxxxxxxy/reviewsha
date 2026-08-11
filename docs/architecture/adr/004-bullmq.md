# ADR: Redis/BullMQ для async jobs

## Context

Нужны очереди, retries, progress и dead-letter handling.

## Decision

Использовать BullMQ поверх Redis с backend QueueService.

## Alternatives

Ручные HTTP-контракты, синхронная обработка и ad-hoc client implementations
рассматривались, но создавали дублирование и непредсказуемые runtime boundaries.

## Consequences

Долгие задачи не блокируют API, но требуют queue monitoring, retry policy и Redis availability.
