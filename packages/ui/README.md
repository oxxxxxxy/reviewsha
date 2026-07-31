# @reviewsha/ui

Общий UI Kit проекта «Ревьюша» для `apps/web` и `apps/admin`.

## Назначение

Пакет содержит переиспользуемые React-компоненты, layout-заготовки, hooks и design tokens. Новые общие элементы интерфейса должны добавляться сюда, а не копироваться между приложениями.

## Компоненты

- Button
- Input
- Textarea
- Select
- Modal
- Dialog
- Card
- Badge
- Spinner
- Loader
- Avatar
- Tooltip
- Table
- Pagination
- EmptyState

## Theme

Экспортируются tokens: `colors`, `spacing`, `radius`, `typography`, `shadows`, `breakpoints`, `theme`.

## Команды

```bash
yarn workspace @reviewsha/ui lint
yarn workspace @reviewsha/ui typecheck
yarn workspace @reviewsha/ui test
yarn workspace @reviewsha/ui build
```
