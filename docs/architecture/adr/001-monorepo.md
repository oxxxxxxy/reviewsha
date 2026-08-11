# ADR: Monorepo и workspace boundaries

## Context

apps и packages разделены по runtime ответственности.

## Decision

Оставить Yarn workspaces с отдельными API/Web/Admin/Worker и shared packages.

## Alternatives

Ручные HTTP-контракты, синхронная обработка и ad-hoc client implementations
рассматривались, но создавали дублирование и непредсказуемые runtime boundaries.

## Consequences

Shared boundaries упрощают сборку и контракты; новые apps/packages добавляются только при ясной runtime ответственности.
