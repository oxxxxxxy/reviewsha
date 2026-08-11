# 15.1 Logging & Audit

## Logging

API и Worker используют structured JSON logs через общий формат
`@reviewsha/config`.

Поддерживаемые уровни:

```text
DEBUG INFO WARN ERROR FATAL
```

Каждый API request получает `X-Request-ID`. Завершение request записывается с
method, path, status code, duration и request ID. Секреты, токены, пароли и API
keys маскируются до вывода и сохранения.

API logs сохраняются в `AdminLog`, а Worker пишет structured logs в stdout
runtime logger. Admin API отдаёт маскированные logs с pagination и filtering.

## Audit

Audit events хранятся отдельно от технических logs в `AuditLog` / `audit_logs`.
Для mutating HTTP requests автоматически сохраняются:

- actor/user ID, если пользователь авторизован;
- action и HTTP result;
- entity type и entity ID, если они есть в URL;
- request ID;
- безопасные metadata;
- timestamp.

Audit persistence выполняется backend-слоем через `AuditLogService`; frontend не
получает доступ к базе напрямую.

## Основные файлы

- `packages/config/src/logger/log-format.ts`
- `apps/api/src/common/logger/api-logger.service.ts`
- `apps/api/src/common/logger/request-logging.middleware.ts`
- `apps/api/src/database/audit-log.service.ts`
- `apps/api/src/database/admin-log-sink.ts`
- `apps/api/src/database/prisma.service.ts`
- `apps/worker/src/common/logger/worker-logger.service.ts`
- `apps/api/prisma/schema.prisma`

Миграции:

- `20260811070000_add_audit_logs`
- `20260811080000_extend_admin_logs`
