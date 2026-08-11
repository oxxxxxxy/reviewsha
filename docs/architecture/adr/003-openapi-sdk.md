# ADR: OpenAPI как источник SDK contract

## Context

Web и Admin должны использовать один typed contract.

## Decision

Генерировать SDK types из актуального OpenAPI и проверять drift в CI.

## Alternatives

Ручные HTTP-контракты, синхронная обработка и ad-hoc client implementations
рассматривались, но создавали дублирование и непредсказуемые runtime boundaries.

## Consequences

Frontend contract воспроизводим и проверяется drift в CI; streaming остаётся typed special case.
