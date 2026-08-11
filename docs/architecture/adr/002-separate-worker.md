# ADR: Worker отдельно от API

## Context

Parsing, AI и report jobs длительные и retryable.

## Decision

Выполнять их в отдельном NestJS context через BullMQ.

## Alternatives

Ручные HTTP-контракты, синхронная обработка и ad-hoc client implementations
рассматривались, но создавали дублирование и непредсказуемые runtime boundaries.

## Consequences

API масштабируется отдельно от compute-heavy Worker; нужны Redis, retries и idempotent processing.
