# Архитектура Frontend проекта "Ревьюша"

## 1. Назначение документа

Этот документ описывает архитектуру пользовательского приложения:

- структуру React приложения;
- страницы;
- маршрутизацию;
- управление состоянием;
- работу с API;
- UI компоненты;
- обработку данных.

Frontend расположен:

```
apps/web
```

---

# 2. Технологический стек

Используется:

```
React 19

+

Vite

+

TypeScript
```

Дополнительные технологии:

```
React Router

TanStack Query

Zustand

React Hook Form

Zod
```

---

# 3. Ответственность Frontend

Frontend отвечает за:

- отображение данных;
- пользовательские действия;
- формы;
- навигацию;
- загрузку файлов;
- отображение прогресса;
- взаимодействие с API.

---

Frontend НЕ отвечает за:

- бизнес-правила;
- анализ кода;
- права доступа;
- расчёт результатов.

## Актуальная реализация Stage 12.1

Пользовательское приложение использует общий UI Kit из `packages/ui` и единый
SDK из `packages/sdk`. UI primitives (`Container`, `Stack`, `Grid`, `Page`,
`Heading`, `Text`, `Label`, `Alert`, `Skeleton`, `IconButton`, `Switch`,
`Toast`, `Dropdown`) не содержат доменной логики. Данные Dashboard загружаются
через TanStack Query из `projects.list`, а статистика строится только из
ответа Backend (без production mock values).

Auth state хранится в Zustand, server state — в TanStack Query. SDK централизует
Bearer header и single-flight refresh: параллельные `401` ждут один refresh и
повторяют исходные запросы; при неудаче сессия очищается.

Основные маршруты Web: `/login`, `/register`, `/dashboard`, `/projects`,
`/reports`, `/chat`, `/settings`. Защищённые маршруты проходят через
`ProtectedRoute`, а API URL задаётся через `VITE_API_URL`.

---

# 4. Архитектура приложения

Структура:

```
apps/web/src/

├── app/
│
├── pages/
│
├── features/
│
├── components/
│
├── layouts/
│
├── hooks/
│
├── api/
│
├── stores/
│
├── utils/
│
├── types/
│
└── styles/
```

---

# 5. App слой

Путь:

```
src/app
```

Отвечает за:

- запуск приложения;
- провайдеры;
- роутинг;
- глобальные настройки.

---

Пример:

```
App.tsx

Router.tsx

Providers.tsx
```

---

# 6. Страницы приложения

Структура:

```
pages/

├── auth/

├── dashboard/

├── projects/

├── scans/

├── reports/

├── chat/

└── settings/
```

---

# 7. Страница авторизации

## Login

```
/login
```

Функции:

- вход;
- восстановление сессии.

---

## Register

```
/register
```

Функции:

- создание аккаунта.

---

# 8. Dashboard

URL:

```
/dashboard
```

Назначение:

Главная страница пользователя.

Отображает:

- проекты;
- последние анализы;
- статистику.

---

# 9. Projects

URL:

```
/projects
```

Функции:

- список проектов;
- создание проекта;
- удаление;
- архивирование.

---

Страница проекта:

```
/projects/:id
```

Содержит:

- описание;
- файлы;
- историю анализов;
- качество проекта.

---

# 10. Upload Flow

Сценарий:

```
User

↓

Drag & Drop

↓

Validation

↓

Upload

↓

Create Scan

↓

Show Progress
```

---

Компоненты:

```
FileUploader

UploadProgress

FileValidator
```

---

# 11. Scan Page

URL:

```
/projects/:id/scans/:scanId
```

Отображает:

- статус анализа;
- этап выполнения;
- процент прогресса.

---

Пример:

```
Подготовка файлов

██████░░░░ 60%

AI анализ
```

---

# 12. Reports

URL:

```
/reports/:id
```

Отображает:

- итоговый рейтинг;
- найденные проблемы;
- рекомендации.

---

Компоненты:

```
IssueList

IssueCard

SeverityBadge

CodePreview
```

---

# 13. AI Chat

URL:

```
/projects/:id/chat
```

Назначение:

Общение с AI по проекту.

---

Возможности:

- вопросы по отчёту;
- объяснение ошибок;
- рекомендации.

---

Компоненты:

```
ChatWindow

MessageList

MessageInput
```

---

# 14. Settings

URL:

```
/settings
```

Настройки:

- профиль;
- пароль;
- активные сессии.

---

# 15. Admin Panel

Отдельное приложение:

```
apps/admin
```

Но использует:

```
packages/ui

packages/sdk

packages/types
```

---

# 16. Routing

Используется:

```
React Router
```

Структура:

```
/

├── login

├── register

├── dashboard

├── projects

│   └── :id

│       └── scans

│       └── reports

│       └── chat

└── settings
```

---

# 17. Управление серверным состоянием

Используется:

```
TanStack Query
```

Для:

- API запросов;
- кеширования;
- обновления данных.

---

Пример:

```
useProjects()

useReports()

useScanStatus()
```

---

# 18. Локальное состояние

Используется:

```
Zustand
```

Для:

- UI состояния;
- модальных окон;
- фильтров;
- настроек.

---

Не хранить:

- пользователей;
- проекты;
- отчёты.

Они находятся в Query Cache.

---

# 19. Формы

Используется:

```
React Hook Form

+

Zod
```

---

Пример:

Создание проекта:

```
name

description

language
```

---

Поток:

```
Input

↓

Validation

↓

API

↓

Success/Error
```

---

# 20. API слой

Frontend не делает прямые запросы.

Используется:

```
packages/sdk
```

---

Пример:

Вместо:

```ts
fetch("/projects")
```

Используется:

```ts
projects.getAll()
```

---

# 21. UI Kit

Общие компоненты:

```
packages/ui
```

---

Компоненты:

```
Button

Input

Modal

Card

Table

Badge

Dropdown

Toast
```

---

# 22. Обработка ошибок

Все ошибки имеют единый формат:

```json
{
 "message": "Project not found",
 "code": "PROJECT_NOT_FOUND"
}
```

---

Frontend показывает:

- уведомление;
- состояние ошибки;
- повтор действия.

---

# 23. Реальное время

Для прогресса анализа:

Варианты:

## MVP

Polling:

```
GET /scan/:id/status
```

---

## Будущее

WebSocket:

```
Backend

↓

Frontend

scan.progress
```

---

# 24. Безопасность

Frontend:

- не хранит секреты;
- не проверяет права самостоятельно;
- не доверяет пользовательскому вводу.

---

Проверки выполняются:

```
Frontend

↓

Backend

↓

Database
```

---

# 25. Производительность

Используется:

- lazy loading страниц;
- code splitting;
- кеширование запросов;
- оптимизация больших списков.

---

# 26. Будущие расширения

Можно добавить:

- VS Code Extension;
- GitHub App;
- онлайн редактор кода;
- совместный просмотр отчётов;
- комментарии.

---

# 27. Итоговая схема

```
             React App

                |

        -----------------

        |               |

    Components       Pages

        |

    TanStack Query

        |

      SDK Layer

        |

        API

        |

     NestJS Backend
```

Главный принцип:

> Frontend предоставляет удобный интерфейс работы с системой, но не содержит бизнес-логики и не заменяет backend.

# 28. UI Kit и Frontend детализация для MVP

Этот раздел закрывает проектирование UI Kit и frontend-слоёв перед стартом реализации.

---

## 28.1. Структура packages/ui

```txt
packages/ui/
├── src/
│   ├── components/
│   │   ├── button/
│   │   ├── input/
│   │   ├── textarea/
│   │   ├── select/
│   │   ├── checkbox/
│   │   ├── dialog/
│   │   ├── dropdown/
│   │   ├── table/
│   │   ├── tabs/
│   │   ├── badge/
│   │   ├── card/
│   │   ├── alert/
│   │   ├── toast/
│   │   ├── progress/
│   │   ├── skeleton/
│   │   └── empty-state/
│   ├── layout/
│   │   ├── app-shell/
│   │   ├── sidebar/
│   │   ├── header/
│   │   └── page-container/
│   ├── tokens/
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── radius.ts
│   │   ├── typography.ts
│   │   └── shadows.ts
│   ├── hooks/
│   ├── utils/
│   └── index.ts
├── package.json
└── tsconfig.json
```

---

## 28.2. Базовые компоненты MVP

### Forms

```txt
Button
Input
PasswordInput
Textarea
Select
Checkbox
FormField
FormError
FileDropzone
```

### Data display

```txt
Card
Badge
SeverityBadge
StatusBadge
Table
CodeBlock
IssueCard
ReportScore
```

### Feedback

```txt
Toast
Alert
Progress
Spinner
Skeleton
EmptyState
ErrorState
```

### Overlay

```txt
Dialog
ConfirmDialog
DropdownMenu
Tooltip
```

### Layout

```txt
AppShell
Sidebar
Header
PageContainer
AuthLayout
AdminLayout
```

---

## 28.3. Design tokens

```txt
colors:
  background
  foreground
  muted
  primary
  secondary
  success
  warning
  danger
  info
  border

spacing:
  0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24

radius:
  sm, md, lg, xl, full

typography:
  h1, h2, h3, body, small, code

severity colors:
  INFO      → blue
  LOW       → green
  MEDIUM    → yellow
  HIGH      → orange
  CRITICAL  → red
```

---

## 28.4. Frontend feature структура

```txt
apps/web/src/
├── app/
│   ├── router.tsx
│   ├── providers.tsx
│   └── app.tsx
├── pages/
│   ├── login/
│   ├── register/
│   ├── dashboard/
│   ├── projects/
│   ├── project-detail/
│   ├── upload/
│   ├── scan/
│   ├── report-detail/
│   ├── chat/
│   ├── settings/
│   └── profile/
├── features/
│   ├── auth/
│   ├── projects/
│   ├── files/
│   ├── scans/
│   ├── reports/
│   ├── issues/
│   └── chat/
├── entities/
├── shared/
└── main.tsx
```

---

## 28.5. Routing MVP

```txt
/public
  /login
  /register

/private
  /
  /dashboard
  /projects
  /projects/new
  /projects/:projectId
  /projects/:projectId/upload
  /projects/:projectId/scans/:scanId
  /reports/:reportId
  /reports/:reportId/chat
  /settings
  /profile

/admin
  /admin
  /admin/users
  /admin/queues
  /admin/logs
  /admin/ai-usage
```

Guards:

```txt
PublicRoute
PrivateRoute
AdminRoute
```

---

## 28.6. State ownership

```txt
Server state       → TanStack Query
Auth tokens        → Auth store + secure storage strategy
UI state           → Zustand
Forms              → React Hook Form + Zod
URL filters        → React Router search params
Upload progress    → local state + future websocket
Scan progress      → polling query every 2s in MVP
```

---

## 28.7. API слой Frontend

```txt
packages/sdk/
├── src/
│   ├── client.ts
│   ├── auth.ts
│   ├── projects.ts
│   ├── files.ts
│   ├── scans.ts
│   ├── reports.ts
│   ├── chat.ts
│   └── admin.ts
```

Правила:

- UI не вызывает `fetch` напрямую;
- все запросы идут через SDK;
- SDK добавляет Authorization header;
- SDK умеет refresh token;
- ошибки приводятся к единому типу `ApiError`.

---

## 28.8. Основные экраны MVP

```txt
LoginPage
RegisterPage
DashboardPage
ProjectsPage
ProjectDetailPage
UploadArchivePage
ScanProgressPage
ReportDetailPage
ReportIssuesPage
ReportChatPage
SettingsPage
AdminDashboardPage
AdminUsersPage
AdminQueuesPage
```

---

## 28.9. MVP UX flow

```txt
Register/Login
  ↓
Dashboard
  ↓
Create Project
  ↓
Upload ZIP
  ↓
Start Scan
  ↓
Scan Progress
  ↓
Report
  ↓
Issues / Export / AI Chat
```

## Stage 12.2 progress

Project UI uses the real Projects, Uploads and Reports SDK services. Project
details support editing name/description/tags, archive state, ZIP client
validation, upload version history and project change history. Uploads remain
server-validated and are sent through `UploadsAPI` with progress callbacks.

The chat screen uses the SDK SSE abstraction (`ChatAPI.stream`) rather than
implementing transport in React. The shared transport parses `text/event-stream`,
supports `AbortController` cancellation and applies the same bearer/refresh
policy as regular requests. Backend remains responsible for context, memory,
authorization and persistence.

Admin authentication is isolated in `apps/admin`: `AdminProtectedRoute` restores
the shared JWT session, requires `ADMIN`/`SUPER_ADMIN`, and redirects anonymous or
forbidden users to the admin login. Admin users/projects tables use the SDK and
TanStack Query with server-side pagination parameters and explicit loading,
empty and error states. Logout clears the SDK token, refresh handler and admin
cache state.

## Stage 12.2 progress

The Web project detail flow now uses the real analysis API for starting and
polling an analysis, shows upload versions and project history, and links to
reports and project chat. Reports support detailed findings plus Markdown, PDF
and JSON downloads and two-report comparison. Settings updates the profile and
changes the password through the authenticated API. Chat sends only through the
shared SSE SDK transport and exposes cancellation and user-facing stream errors.
