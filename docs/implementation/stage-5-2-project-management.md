# Stage 5.2 — Project Management

> **Historical implementation note.** This document records an earlier plan or execution checkpoint. It is retained for traceability; current behavior is defined by code and the canonical docs index.

**Status: ✅ COMPLETE**

## Реализовано

- CRUD проектов с проверкой владельца и ADMIN override.
- Soft delete через `deletedAt` и статус `DELETED`.
- Архивирование (`ARCHIVED`) и восстановление (`ACTIVE`).
- Нормализованные уникальные теги проекта, максимум 20 тегов по 50 символов.
- Поиск, пагинация, сортировка, фильтрация по статусу, visibility, языку, тегам и датам.
- Статистика проекта: количество анализов/загрузок и дата последнего анализа.
- История действий с actor и JSON `changedFields`.
- Domain events: created, updated, archived, restored, deleted, tag added/removed.
- SDK методы `restore()` и `history()` и расширенные параметры списка.

## API

```text
GET    /api/v1/projects
GET    /api/v1/projects/:id
POST   /api/v1/projects
PATCH  /api/v1/projects/:id
DELETE /api/v1/projects/:id
POST   /api/v1/projects/:id/archive
POST   /api/v1/projects/:id/restore
GET    /api/v1/projects/:id/history
```

## Database

Migration: `20260805191056_add_project_tags_and_history`.
Добавлены таблицы `project_tags`, `project_history` и enum `ProjectHistoryAction`.

## Проверки

```bash
yarn test:stage5
yarn workspace @reviewsha/api build
yarn ci:local
```

Тесты покрывают service lifecycle, tag normalization/events, repository queries,
history, DTO validation and HTTP contracts.
