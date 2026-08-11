# ADR: SSE для chat streaming

## Context

Ответ нужно показывать incremental, но REST достаточно для обычных API.

## Decision

Использовать typed SSE events через API/Redis broker.

## Alternatives

Ручные HTTP-контракты, синхронная обработка и ad-hoc client implementations
рассматривались, но создавали дублирование и непредсказуемые runtime boundaries.

## Consequences

Пользователь получает incremental output; disconnect, cancellation, buffering и final persistence требуют отдельных тестов.
