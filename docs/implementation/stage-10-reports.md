# Этап 10 — Reports

> **Historical implementation note.** This document records an earlier plan or execution checkpoint. It is retained for traceability; current behavior is defined by code and the canonical docs index.

Статус: **COMPLETE**. API реализован в `apps/api/src/modules/reports`.

`ReportsController → ReportsService → ReportsRepository` обеспечивает:

- получение отчёта и статуса;
- пагинированную историю отчётов проекта;
- сравнение двух версий (score, новые/исправленные issues, severity и
  recommendations);
- soft delete отчёта;
- экспорт Markdown, JSON и PDF.

Все операции проверяют JWT и владельца проекта; ADMIN/SUPER_ADMIN имеют
административный доступ. Экспорт создаётся идемпотентно, сохраняется через
`StorageService` в private reports bucket, а metadata/checksum — в
`ReportExport`. Удаление отчёта удаляет связанные storage objects перед soft
delete, поэтому висячие экспорты не остаются.

## Lifecycle

```text
Worker ReportProcessor
  → Report READY + Findings
  → GET /reports/:id
  → GET /reports/:id/export/{md|json|pdf}
  → StorageService / MinIO + ReportExport
```

При terminal ошибке report job сохраняет `Report.status=FAILED`. Большие списки
истории пагинируются, а повторный export возвращает существующий объект.

## Проверка

```bash
yarn test:stage10
RUN_BACKEND_E2E=true yarn vitest run tests/stage10/full-backend.e2e.test.ts \
  --coverage=false --pool=threads
```

Полный E2E поднимает реальный API/Worker поверх PostgreSQL, Redis и MinIO и
проверяет путь upload → AI → report → exports → history/compare.
