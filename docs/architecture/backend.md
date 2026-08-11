# Backend modules и boundaries

API имеет глобальный prefix `api/v1`. Authentication и validation подключены
глобально; неизвестные поля DTO отклоняются.

## Основные модули

| Модуль | Ответственность | Хранилище/граница |
| --- | --- | --- |
| `auth` | register/login/refresh/logout/profile/password | users, sessions, JWT |
| `users` | user CRUD для разрешённых сценариев | User repository |
| `projects` | project lifecycle, tags, history, ownership | Project repository |
| `uploads` | multipart archive validation, version, MinIO | UploadedFile + storage |
| `pipeline` | scan lifecycle, status/progress/cancel | Scan + QueueService |
| `reports` | report status, history, exports, compare | Report + MinIO |
| `chat` | session/message/history/context/stream | ChatSession/Message + Worker |
| `admin` | overview, users, projects, queues, logs, usage, stats, AI runtime settings | service adapters + encrypted `SystemSetting` |
| `health` | dependency health endpoint | DB/Redis/storage checks |

## Request flow

```text
Controller
  → DTO validation/auth guard
  → Service (business rules/ownership)
  → Repository or QueueService
  → response mapper / error filter
```

Prisma queries находятся в repository/data-access layer. Сервис может вызвать
shared infrastructure service, но не должен обходить authorization.

## Ошибки

HTTP errors проходят через общий exception filter и API error envelope. Не
возвращайте stack trace или provider secrets клиенту. Для нового endpoint
добавьте DTO, Swagger responses, unit/integration test и обновление SDK drift.

## Ownership и roles

- обычный пользователь видит только собственные/доступные projects;
- chat/report/upload доступ проверяется по project/session ownership;
- admin endpoints требуют JWT и role guard;
- `SUPER_ADMIN` не должен случайно получать обход обычной модели данных без
  явного решения.

## Admin AI runtime settings

Администратор может менять runtime-конфигурацию OmniRoute через Admin API:

```text
Admin UI → generated SDK → AdminController
        → AdminAiSettingsService → encrypted SystemSetting
        → WorkerAiRuntimeSettingsService → OmniRouter provider
```

В `SystemSetting` хранится зашифрованный JSON с provider, base URL, model и
generation limits. Ключ шифрования берётся из `INTERNAL_API_KEY`/настроенного
settings encryption key и не возвращается API. Ответы содержат только
`apiKeyConfigured` и маскированное представление ключа.

Worker читает эту настройку из PostgreSQL при создании provider request и
сохраняет env defaults как fallback. Поэтому изменение модели или gateway не
требует пересборки образа; следующий AI job использует сохранённое значение.
