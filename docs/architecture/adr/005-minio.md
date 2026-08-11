# ADR: MinIO для object storage

## Context

Архивы и exports не должны храниться в PostgreSQL.

## Decision

Использовать приватные buckets и object keys, metadata хранить в DB.

## Alternatives

Ручные HTTP-контракты, синхронная обработка и ad-hoc client implementations
рассматривались, но создавали дублирование и непредсказуемые runtime boundaries.

## Consequences

Большие бинарные объекты отделены от relational data; storage availability и lifecycle становятся operational concerns.
