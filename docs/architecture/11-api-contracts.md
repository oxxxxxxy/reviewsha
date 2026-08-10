# API Contracts проекта "Ревьюша"

## Client contract

Web и Admin используют `@reviewsha/sdk` как единую точку API-доступа. Auth,
Projects, Reports и Chat не создают собственные transport-клиенты. При
изменении Backend сначала обновляются Swagger/OpenAPI и SDK, затем consumers.
Dashboard использует пагинированный `GET /projects`; статистика проектов
включает `stats.reportsCount`, возвращаемый Backend.

## Reports API (Stage 10)

Все маршруты используют base path `/api/v1`, Bearer JWT и ownership проекта.

| Method | Route | Result |
| --- | --- | --- |
| GET | `/reports/:id` | Report, summary, score, findings, recommendations, exports |
| GET | `/reports/:id/status` | `GENERATING`, `READY` или `FAILED` |
| DELETE | `/reports/:id` | Soft delete и очистка export objects |
| GET | `/reports/:id/export/md` | Persistent Markdown attachment |
| GET | `/reports/:id/export/json` | Versioned JSON attachment |
| GET | `/reports/:id/export/pdf` | PDF attachment |
| GET | `/projects/:id/reports?page=1&limit=50` | Пагинированная история |
| GET | `/reports/compare?oldReportId=…&newReportId=…` | Score/issues/severity/recommendation diff |

`400` возвращается для неверного UUID, формата или cross-project compare;
`401` без JWT, `403` для чужого проекта, `404` для отсутствующего/удалённого
отчёта. Storage keys и MinIO credentials никогда не входят в API response.

## 1. Назначение документа

Этот документ описывает контракт взаимодействия между:

```
Frontend

↓

Backend API
```

Определяет:

- endpoints;
- HTTP методы;
- DTO;
- структуру ответов;
- ошибки;
- правила пагинации.

---

# 2. Общие правила API

Тип:

```
REST API
```

Формат:

```
JSON
```

Base URL:

```
/api/v1
```

Пример:

```
GET /api/v1/projects
```

---

# 3. Общий формат ответа

Успешный ответ:

```json
{
  "data": {},
  "meta": {}
}
```

---

Ошибка:

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project not found"
  }
}
```

---

# 4. HTTP коды

Используются:

```
200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

429 Too Many Requests

500 Internal Server Error
```

---

# 5. Авторизация

Все приватные запросы:

Header:

```
Authorization:

Bearer ACCESS_TOKEN
```

---

# 6. Auth API

## Регистрация

```
POST /auth/register
```

Request:

```json
{
 "email": "user@mail.com",
 "password": "password",
 "name": "Alex"
}
```

Response:

```json
{
 "user": {
   "id": "123",
   "email": "user@mail.com"
 },
 "tokens": {
   "accessToken": "...",
   "refreshToken": "..."
 }
}
```

## Вход

```
POST /auth/login
```

Request:

```json
{
 "email": "user@mail.com",
 "password": "password"
}
```

---

## Обновление токена

```
POST /auth/refresh
```

Request:

```json
{
 "refreshToken": "..."
}
```

---

## Текущий пользователь

```
GET /auth/me
```

Response:

```json
{
 "id": "123",
 "email": "user@mail.com",
 "name": "Alex"
}
```

---

# 7. Projects API

## Получить проекты

```
GET /projects
```

Query:

```
?page=1

&limit=20
```

Response:

```json
{
 "data": [
  {
   "id": "1",
   "name": "Portfolio",
   "language": "TypeScript"
  }
 ]
}
```

---

## Создать проект

```
POST /projects
```

Request:

```json
{
 "name": "My App",
 "description": "React project",
 "language": "TypeScript"
}
```

---

## Получить проект

```
GET /projects/:id
```

---

## Обновить проект

```
PATCH /projects/:id
```

---

## Удалить проект

```
DELETE /projects/:id
```

Фактический Projects API использует envelope-формат `{ data, meta }` для списка и `{ data }` для одной сущности. USER получает только свои проекты, ADMIN — любые проекты. Список дополнительно поддерживает `search`, `language`, `tags`, `status`, `visibility`, `createdFrom`, `createdTo`, `sort` и `order`.

## Архивирование проекта

```
POST /projects/:id/archive
```

## Восстановление и история проекта

```text
POST /projects/:id/restore
GET  /projects/:id/history
```

Удаление через `DELETE /projects/:id` является soft delete. Ответ проекта содержит
`tags` и `stats` (`analysesCount`, `uploadsCount`, `lastAnalysisAt`).

---

# 8. File API

## Upload Pipeline

```text
POST /projects/:projectId/uploads
GET  /projects/:projectId/uploads
```

Запрос `multipart/form-data` содержит поле `file`. Ответ содержит `id`, `status`,
`version`, `size`, `mimeType`, `checksum` и `storageKey`. Загрузки ограничены владельцем
проекта или ADMIN. Ошибки валидации возвращают `422` с кодами `INVALID_FILE_TYPE`,
`INVALID_ARCHIVE`, `FILE_TOO_LARGE` или `ZIP_BOMB_DETECTED`.

## Загрузка файла

```
POST /projects/:id/files
```

Тип:

```
multipart/form-data
```

---

Параметры:

```
file

projectId
```

---

Response:

```json
{
 "id": "123",
 "filename": "project.zip",
 "size": 5000000
}
```

---

## Получить файлы проекта

```
GET /projects/:id/files
```

---

# 9. Scan API

## Запустить анализ

```
POST /projects/:id/scans
```

---

Request:

```json
{
 "fileId": "123"
}
```

---

Response:

```json
{
 "scanId": "456",
 "status": "QUEUED"
}
```

---

## Получить статус анализа

```
GET /scans/:id
```

Response:

```json
{
 "id": "456",
 "status": "PROCESSING",
 "progress": 65,
 "step": "AI_ANALYSIS"
}
```

---

## История анализов

```
GET /projects/:id/scans
```

---

# 10. Report API

## Получить отчёт

```
GET /reports/:id
```

Response:

```json
{
 "id": "123",
 "score": 82,
 "summary": "...",
 "issuesCount": 15
}
```

---

## Получить проблемы

```
GET /reports/:id/issues
```

---

Query:

```
severity=HIGH

&page=1
```

---

Response:

```json
{
 "data": [
  {
   "title": "SQL Injection",
   "severity": "HIGH",
   "file": "user.service.ts",
   "line": 42
  }
 ]
}
```

---

# 11. Export API

## Скачать отчёт

```
POST /reports/:id/export
```

Request:

```json
{
 "format": "PDF"
}
```

---

Response:

```json
{
 "url": "temporary-download-url"
}
```

---

# 12. AI Chat API (11.1)

Все endpoint защищены JWT. Доступ к проекту и `ChatSession` ограничен владельцем; `ADMIN` и
`SUPER_ADMIN` используют серверную RBAC-политику. Базовый путь приложения: `/api/v1`.

## Создать чат

```
POST /projects/:id/chat
```

---

Response:

```json
{
  "id": "uuid",
  "title": "New Chat",
  "updatedAt": "2026-08-08T00:00:00.000Z",
  "messagesCount": 0
}
```

---

## Список чатов проекта

```
GET /projects/:id/chat?page=1&limit=50
```

Ответ содержит `data` и `meta { page, limit, total }`.

---

## История сообщений

```
GET /chat/:sessionId/messages?page=1&limit=50
```

Сообщения возвращаются по возрастанию времени; `SYSTEM`-сообщения наружу не выдаются.

---

## Отправить сообщение

```
POST /chat/:sessionId/messages
```

Request:

```json
{
  "message": "Почему AI отметил JWT?"
}
```

---

Response:

```json
{
  "id": "uuid",
  "role": "ASSISTANT",
  "content": "Проблема возникает потому...",
  "tokens": 42,
  "createdAt": "2026-08-08T00:00:00.000Z"
}
```

Ошибки: `400` — невалидное сообщение, `403` — чужая сессия, `404` — сессия/проект не найден,
`412` — нет завершённого анализа, `503` — AI Provider недоступен, `504` — timeout.

## Streaming (11.2)

`POST /chat/:sessionId/stream`, response `text/event-stream`; события `token`, `complete`, `error`.
История дополнительно принимает `search`, `before`, `after`, `sort=asc|desc`.

---

# 13. Admin API

Доступ:

```
ADMIN role
```

---

## Пользователи

```
GET /admin/users
```

---

## Статистика

```
GET /admin/statistics
```

Возвращает:

- количество пользователей;
- анализы;
- AI расходы.

---

## Очереди

```
GET /admin/queues
```

---

# 14. Pagination

Все большие списки используют:

```
page

limit
```

---

Response:

```json
{
 "data": [],

 "meta": {
   "page":1,
   "limit":20,
   "total":300
 }
}
```

---

# 15. Filtering

Используется query параметры.

Пример:

```
GET /issues?

severity=HIGH

&category=SECURITY
```

---

# 16. Sorting

Формат:

```
sortBy

sortOrder
```

Пример:

```
sortBy=createdAt

sortOrder=desc
```

---

# 17. Версионирование API

Используется:

```
/api/v1
```

---

При изменении:

```
/api/v2
```

Старые клиенты продолжают работать.

---

# 18. WebSocket события (будущее)

Для realtime:

```
scan.progress

scan.completed

notification.created
```

---

Пример:

```
Backend

↓

WebSocket

↓

Frontend
```

---

# 19. OpenAPI

Все endpoints документируются через:

```
Swagger
```

URL:

```
/api/docs
```

---

# 20. Итоговая схема

```
React

 |

SDK

 |

REST API

 |

NestJS Controllers

 |

Services

 |

Database / Queue / Storage
```

Главный принцип:

> API контракт является единой точкой согласования между frontend и backend и должен изменяться только осознанно.

## Chat and pipeline client contracts

Chat streaming uses `POST /chat/:sessionId/stream` with JSON body `{message}`
and a `text/event-stream` response. Clients consume it through `ChatAPI.stream`,
not by duplicating SSE transport in pages. Pipeline status is available through
`GET /pipelines/:id`; `resume` and `cancel` are POST operations using the same
identifier.

## Admin client boundary

The admin application uses the same SDK client and auth/refresh mechanism as the
web application. Admin user/project reads are routed through the existing
authenticated API resources; the backend remains the RBAC boundary. The admin
frontend never accesses Redis, PostgreSQL or storage directly.

Analysis uses `GET /projects/:projectId/analyses` for paginated status history
and `POST /projects/:projectId/analyses` to start the latest completed upload (or
an explicitly selected upload via `uploadId`). Profile and password settings use
`PATCH /auth/me` and `POST /auth/change-password`.

Administrative operations are exposed under `/admin` and require the `ADMIN`
role: `GET /admin/overview`, `GET /admin/queues`, paginated
`GET /admin/queues/:queueName/jobs`, `POST .../retry` and `DELETE .../:jobId`.
The frontend never accesses BullMQ or Redis directly.

The canonical schema is generated at `docs/generated/openapi.json` by
`yarn docs:openapi` and checked by `yarn openapi:validate`. CI runs both steps;
the generated SDK remains the next migration boundary for stage 14.1.

Operational metrics are also available through the protected
`GET /admin/ai-usage` and `GET /admin/statistics` endpoints. Aggregation is
performed by the backend from persisted usage and analysis records.

`GET /admin/logs` provides paginated, server-side `level`, `service` and
`search` filters over persisted masked `AdminLog` records.

Admin detail reads use the existing ownership-aware `GET /users/:id` and
`GET /projects/:id` resources; the `ADMIN` role is enforced by the backend.
