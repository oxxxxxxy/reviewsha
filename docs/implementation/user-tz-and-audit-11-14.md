# Проект Reviewsha — ТЗ пользователя и сверка этапов 11–14

Дата создания файла: 2026-08-11

Этот файл создан по запросу пользователя. Раздел «ТЗ пользователя» содержит переданные пользователем планы и чек-листы без добавления новых требований. Фактические сведения о коде вынесены отдельно и должны подтверждаться текущим репозиторием и тестами.

---

## 1. Фактические сведения о текущем репозитории

Источник: текущие файлы репозитория `/run/media/pyot/hdddata2/Rew`, README, package manifests, исходный код и команды проверки.

- Репозиторий — Yarn monorepo.
- Приложения находятся в `apps/`:
  - `apps/api` — NestJS API и Prisma schema/migrations.
  - `apps/web` — пользовательский frontend.
  - `apps/admin` — административный frontend.
  - `apps/worker` — worker/processors/AI pipeline.
- Общие пакеты находятся в `packages/`:
  - `packages/config`
  - `packages/types`
  - `packages/sdk`
  - `packages/ui`
- Chat backend находится в `apps/api/src/modules/chat/`.
- Chat controller фактически находится по пути `apps/api/src/modules/chat/controllers/chat.controller.ts`.
- Chat services фактически находятся в `apps/api/src/modules/chat/services/`.
- Chat repository фактически находится в `apps/api/src/modules/chat/repositories/chat.repository.ts`.
- Chat integration tests находятся в `apps/api/tests/integration/modules/chat/`.
- Chat unit tests находятся в `apps/api/tests/unit/modules/chat/`.
- Prisma schema находится в `apps/api/prisma/schema.prisma`.
- Prisma migrations находятся в `apps/api/prisma/migrations/`.
- Основные локальные команды проекта включают `yarn test`, `yarn typecheck`, `yarn build`, `yarn test:stage11`, `yarn test:stage12`, `yarn test:stage13`, `yarn test:stage14`, `yarn ci:local`.
- Факт прохождения конкретной команды означает только результат этой команды в конкретном состоянии репозитория; это не означает автоматическое закрытие всего этапа.

### Текущая сверка на момент создания файла

- 11.1: PARTIAL.
- 11.2: PARTIAL.
- 12.1: FUNCTIONAL / QA PARTIAL.
- 12.2: PARTIAL.
- 13.1: PARTIAL.
- 13.2: PARTIAL.
- 14.1: PARTIAL.
- 14.2: PARTIAL.

### Зафиксированный текущий пробел 11.1

- `ChatService` должен использовать сохранённый idempotency key, а не только in-process/queue deduplication.
- Миграцию idempotency нужно применить и проверить на базе данных.
- Нужно проверить повтор после перезапуска и реальный database-backed acceptance flow.
- Нужно подключить HTTP получение существующей chat session, если оно требуется пользовательским lifecycle.
- Нельзя объявлять 11.1 COMPLETE только по mocked integration tests.

---

# 2. ТЗ пользователя

Ниже дословно добавлены переданные пользователем планы и чек-листы этапов 11–14.



--- SOURCE: pasted-text-7.txt ---

# Этап 11 — AI Chat: чек-лист сверки

Цель: проверить, что **AI Chat полностью реализован по архитектуре, PRD и связан с реальным AI Pipeline**, а не является просто UI с отправкой текста.

Проверять нужно в связке:

```text
Frontend
   ↓
Chat API
   ↓
Chat Module
   ↓
Project Context
   ↓
AI Pipeline
   ↓
OmniRouter / DeepSeek
   ↓
Streaming
   ↓
Message History
   ↓
AI Memory
```

---

# 11.1 Chat Module

## Chat Domain

* ☐ `ChatModule` существует в Backend.
* ☐ Module подключён в `AppModule`.
* ☐ Соблюдается архитектура Backend.
* ☐ Chat не содержит логики, которая должна находиться в AI Pipeline.
* ☐ Chat отвечает за conversation/message lifecycle.
* ☐ AI Processor отвечает за AI processing.
* ☐ Repository используется через определённый repository layer.

---

## Conversations

Проверить полный lifecycle:

```text
Create conversation
        ↓
Open conversation
        ↓
Send message
        ↓
Receive response
        ↓
History
        ↓
Continue conversation
```

* ☐ Conversation создаётся.
* ☐ Conversation имеет ID.
* ☐ Conversation принадлежит пользователю.
* ☐ Conversation может быть связана с проектом.
* ☐ Нельзя получить чужую conversation.
* ☐ Conversation можно получить по ID.
* ☐ Список conversations работает.
* ☐ Архитектурой предусмотренное удаление/архивирование работает.

---

## Messages

* ☐ User message сохраняется.
* ☐ Assistant message сохраняется.
* ☐ Message имеет role.
* ☐ Message связан с conversation.
* ☐ Message имеет timestamp.
* ☐ Порядок сообщений сохраняется.
* ☐ История корректно восстанавливается.
* ☐ Очень длинное сообщение обрабатывается согласно ограничениям.
* ☐ Пустые сообщения запрещены.

Типичный lifecycle:

```text
User
 ↓
POST message
 ↓
Save USER message
 ↓
Build context
 ↓
AI processing
 ↓
Save ASSISTANT message
```

---

# 11.2 AI Context & Streaming

## Project Context

Главная проверка:

> Chat действительно понимает контекст проекта, а не просто отправляет последний message в модель.

Проверить:

* ☐ Project определяется корректно.
* ☐ Пользователь имеет доступ к проекту.
* ☐ Контекст проекта собирается Backend.
* ☐ Используется актуальная версия проекта.
* ☐ Используются необходимые результаты анализа.
* ☐ Используются релевантные файлы/чанки, если это предусмотрено архитектурой.
* ☐ Контекст не содержит данные другого проекта.
* ☐ Контекст ограничивается допустимым token budget.

---

## Context Isolation

Обязательно проверить security scenario:

```text
User A
 ↓
Project A
 ↓
Chat
```

не должен получить:

```text
Project B
```

Проверить:

* ☐ другой `projectId`;
* ☐ другой `conversationId`;
* ☐ прямой запрос API;
* ☐ попытку подменить ID.

---

# Context Builder

Проверить, что context builder:

```text
Conversation
      +
Project
      +
Analysis
      +
Relevant data
      ↓
Context
```

* ☐ имеет отдельную ответственность;
* ☐ не находится внутри Controller;
* ☐ не дублирует Parser/Chunk Builder;
* ☐ корректно ограничивает размер контекста;
* ☐ корректно обрабатывает отсутствие контекста.

---

# Conversation History

Проверить:

* ☐ Последние сообщения доступны.
* ☐ История сортируется правильно.
* ☐ Pagination работает.
* ☐ Старые сообщения не теряются.
* ☐ Очень длинная история не отправляется целиком в модель.
* ☐ Для AI используется необходимое количество предыдущих сообщений.
* ☐ UI может загрузить историю.

---

# AI Memory

Проверить назначение memory.

Memory **не должна превращаться в бесконечную историю всех сообщений**.

Проверить:

```text
Messages
   ↓
Memory extraction / summary
   ↓
Persistent memory
   ↓
Future context
```

Если memory предусмотрена архитектурой:

* ☐ Memory сохраняется.
* ☐ Memory привязана к правильному пользователю/проекту/conversation.
* ☐ Memory используется при следующем запросе.
* ☐ Memory ограничена по размеру.
* ☐ Не сохраняются случайные/служебные данные.
* ☐ Memory не смешивает проекты.
* ☐ При изменении/удалении проекта применяется соответствующая политика очистки.

---

# Streaming

## Transport

Проверить выбранный архитектурой механизм:

```text
Client
 ↓
Streaming endpoint
 ↓
AI Processor
 ↓
Provider
```

Например SSE, если именно он определён архитектурой.

* ☐ Streaming endpoint существует.
* ☐ Авторизация работает.
* ☐ Content-Type корректный.
* ☐ Connection корректно открывается.
* ☐ Tokens/chunks приходят постепенно.
* ☐ Final event/result корректно определяется.
* ☐ Ошибка streaming передаётся клиенту.
* ☐ Connection закрывается после завершения.

---

## Streaming lifecycle

Проверить:

```text
REQUEST
  ↓
VALIDATION
  ↓
SAVE USER MESSAGE
  ↓
BUILD CONTEXT
  ↓
AI REQUEST
  ↓
STREAM CHUNKS
  ↓
FINAL RESPONSE
  ↓
SAVE ASSISTANT MESSAGE
```

Особенно важно:

> Если streaming оборвался, система не должна оставлять conversation в неконсистентном состоянии.

---

# Disconnect Handling

Проверить:

```text
Client
 ↓
Streaming
 ↓
Disconnect
```

Backend должен корректно обработать disconnect.

Проверить:

* ☐ AI request отменяется, если это поддерживается.
* ☐ Worker/provider не продолжает бессмысленно работу.
* ☐ Partial response обрабатывается по определённой политике.
* ☐ Connection закрывается.
* ☐ Нет memory leak.
* ☐ Нет зависших jobs.

---

# Duplicate Requests

Проверить ситуацию:

```text
User clicks Send
User clicks Send
```

или повтор запроса из-за network retry.

* ☐ Не создаются случайные дубликаты сообщений.
* ☐ Есть idempotency strategy, если она предусмотрена.
* ☐ Frontend блокирует очевидный double-submit.
* ☐ Backend остаётся защищённым от повторного запроса.

---

# AI Integration

Chat должен использовать существующий AI Pipeline:

```text
Chat
 ↓
Context
 ↓
Prompt Builder
 ↓
OmniRouter
 ↓
DeepSeek
```

Проверить:

* ☐ Chat не вызывает DeepSeek напрямую.
* ☐ Chat не содержит отдельную реализацию AI client.
* ☐ Используется общий AI Processor.
* ☐ Используется общий OmniRouter.
* ☐ Используется существующий Prompt Builder.
* ☐ Token usage учитывается.
* ☐ AI errors обрабатываются общим механизмом.

---

# Error Handling

Проверить:

### Client

* ☐ Network error.
* ☐ Unauthorized.
* ☐ Forbidden.
* ☐ Conversation not found.
* ☐ Project not found.
* ☐ Validation error.
* ☐ AI unavailable.
* ☐ Streaming error.

### Backend

* ☐ Provider timeout.
* ☐ Provider error.
* ☐ Rate limit.
* ☐ Context too large.
* ☐ Invalid AI response.
* ☐ Database error.

Ошибки не должны приводить к:

```text
500 + потеря сообщения + зависший stream
```

без корректного recovery.

---

# Security

## Authorization

Проверить каждый endpoint:

* ☐ USER может работать только со своими conversations.
* ☐ USER может писать только в доступный project.
* ☐ Нельзя получить чужую историю.
* ☐ Нельзя подменить `userId`.
* ☐ Нельзя получить чужую memory.
* ☐ Admin access соответствует общей RBAC-модели.

---

## Prompt Injection

Поскольку Chat работает с содержимым проекта, проверить:

```text
Project file
     ↓
malicious instructions
     ↓
AI context
```

AI не должен автоматически воспринимать содержимое анализируемого проекта как системные инструкции.

Должно быть разделение:

```text
System instructions
User message
Project content
Retrieved context
```

---

# Limits

Определённые архитектурой ограничения должны реально применяться:

* ☐ max message length;
* ☐ max context size;
* ☐ rate limit;
* ☐ max conversation history;
* ☐ provider limits;
* ☐ timeout.

Проверить, что ограничения находятся **на Backend**, а не только в UI.

---

# Database

Проверить соответствующие модели:

```text
Conversation
Message
Memory
```

если именно такие сущности определены Prisma Schema.

* ☐ Foreign keys корректны.
* ☐ User relation.
* ☐ Project relation.
* ☐ Conversation → Messages.
* ☐ правильные indexes;
* ☐ timestamps;
* ☐ delete policy;
* ☐ cascade/restrict соответствует архитектуре.

---

# API Contract

Сверить Chat API с:

```text
docs/architecture/11-api-contracts.md
```

Проверить:

* ☐ endpoints;
* ☐ request DTO;
* ☐ response DTO;
* ☐ status codes;
* ☐ errors;
* ☐ authentication;
* ☐ streaming contract.

После изменения API:

* ☐ OpenAPI обновлён.
* ☐ SDK regenerated.
* ☐ Frontend использует новый contract.

---

# Frontend

Проверить:

* ☐ Chat page существует.
* ☐ Conversation list.
* ☐ Message list.
* ☐ Input.
* ☐ Send.
* ☐ Streaming response.
* ☐ Loading state.
* ☐ Error state.
* ☐ Empty state.
* ☐ Retry.
* ☐ Scroll.
* ☐ Long messages.
* ☐ Code blocks, если предусмотрены.
* ☐ Markdown, если предусмотрен.
* ☐ Mobile layout.

---

# Главный E2E сценарий

Пройти полностью:

```text
Login
 ↓
Open Project
 ↓
Open Chat
 ↓
Create Conversation
 ↓
Send Message
 ↓
Build Project Context
 ↓
AI Processing
 ↓
Streaming
 ↓
Save Assistant Message
 ↓
Refresh page
 ↓
History restored
 ↓
Send second message
 ↓
Previous context available
```

---

# Negative E2E

Проверить минимум:

```text
Invalid conversation ID
Invalid project ID
Unauthorized request
Foreign project
Empty message
Huge message
AI timeout
AI provider error
Streaming disconnect
Network disconnect
Double submit
```

---

# Тесты

Так как тесты в проекте пишутся **по ходу разработки**, к закрытию 11 должны быть покрыты основные критические сценарии.

Ориентир:

### Unit

**30–40 тестов**

Покрыть:

* Context Builder;
* memory;
* message validation;
* conversation service;
* authorization;
* prompt preparation;
* streaming state;
* error handling.

### Integration

**20–30 тестов**

Проверить:

```text
Chat API
 ↓
Database
 ↓
Context
 ↓
AI Processor
```

### E2E

**8–12 сценариев**

Минимум:

1. Create conversation.
2. Send message.
3. Receive streaming response.
4. History persistence.
5. Project context.
6. Memory.
7. Unauthorized conversation.
8. Foreign project.
9. AI failure.
10. Streaming disconnect.

---

# Manual QA

Обязательно вручную проверить:

* ☐ обычный вопрос;
* ☐ вопрос по содержимому проекта;
* ☐ несколько сообщений подряд;
* ☐ длинный ответ;
* ☐ streaming;
* ☐ refresh страницы;
* ☐ повторное открытие conversation;
* ☐ ошибка AI;
* ☐ disconnect;
* ☐ mobile;
* ☐ logout/login;
* ☐ переключение между проектами.

Особенно:

```text
Project A
 ↓
Chat
 ↓
Ask question

Project B
 ↓
Chat
 ↓
Ask question
```

Ответы и контекст **не должны смешиваться**.

---

# Проверка производительности

* ☐ Большая история не загружает всё сразу.
* ☐ Context Builder не делает N+1 запросов.
* ☐ Chat не создаёт лишние DB queries.
* ☐ Streaming не буферизуется целиком.
* ☐ Memory не растёт бесконечно.
* ☐ Нет зависших connections.
* ☐ Concurrent chats работают.
* ☐ Provider timeout ограничен.
* ☐ Redis/queue не используются в обход архитектуры.

---

# Документация

После проверки сверить:

```text
docs/architecture/09-ai-pipeline.md
docs/architecture/11-api-contracts.md
docs/architecture/10-frontend.md
```

Обновить, если фактическая реализация отличается от первоначальной.

Особенно задокументировать:

* ☐ Chat architecture.
* ☐ Context flow.
* ☐ Memory strategy.
* ☐ Streaming protocol.
* ☐ Error handling.
* ☐ Authorization.
* ☐ Limits.
* ☐ API contract.

---

# Итоговый критерий закрытия 11

Этап 11 можно закрыть, если полностью работает:

```text
                    Project
                       │
                       ↓
                  Conversation
                       │
                       ↓
                    Message
                       │
                       ↓
                Context Builder
                       │
              ┌────────┴────────┐
              ↓                 ↓
         Chat History         Memory
              │                 │
              └────────┬────────┘
                       ↓
                  Prompt Builder
                       ↓
                   OmniRouter
                       ↓
                    DeepSeek
                       ↓
                  AI Processor
                       ↓
                   Streaming
                       ↓
                  Assistant
                       ↓
                 Save Message
```

И главное:

* ☐ Chat работает с реальным AI.
* ☐ Streaming работает.
* ☐ История сохраняется.
* ☐ Project Context работает.
* ☐ Memory работает согласно архитектуре.
* ☐ Authorization проверена.
* ☐ Чужие проекты/чаты недоступны.
* ☐ Ошибки и disconnect обработаны.
* ☐ Frontend использует API/SDK.
* ☐ OpenAPI актуален.
* ☐ Тесты написаны.
* ☐ E2E проходит.
* ☐ Manual QA пройден.
* ☐ Документация соответствует фактической реализации.

**После этого 11 можно считать полностью закрытым.**


--- SOURCE: pasted-text-1.txt ---

# 12.1 Core Application (UI Kit, Auth, Dashboard)

**Статус:** ⏳ TODO

# Цель этапа

Создать базовую часть пользовательского Frontend приложения: единый UI Kit, авторизацию и Dashboard.

После завершения **12.1** пользователь должен иметь возможность:

```text
Открыть Web App
      ↓
Login / Register
      ↓
Authenticated Application
      ↓
Dashboard
      ↓
Навигация по основным разделам
```

При этом Frontend должен использовать существующие API, типы и архитектуру проекта, а не содержать временных mock-реализаций.

---

# 12.1.1 Архитектура Frontend

Работа выполняется в:

```text
apps/web/
```

Использовать архитектуру:

```text
apps/web/src/

├── app/
│   ├── router/
│   ├── providers/
│   └── layouts/
│
├── pages/
│   ├── auth/
│   └── dashboard/
│
├── features/
│   ├── auth/
│   └── dashboard/
│
├── components/
│
├── hooks/
│
├── services/
│
├── stores/
│
├── lib/
│
└── styles/
```

Конкретная структура может отличаться, но необходимо сохранить разделение:

```text
UI

↓

Features

↓

Application Logic

↓

API / SDK
```

Не допускать бизнес-логику непосредственно внутри визуальных компонентов.

---

# 12.1.2 UI Kit

Основой приложения должен стать общий UI Kit из:

```text
packages/ui/
```

Frontend не должен создавать собственные дубликаты базовых компонентов без необходимости.

---

## Базовые компоненты

Минимальный набор:

### Layout

* ☐ `Container`
* ☐ `Stack`
* ☐ `Grid`
* ☐ `Page`
* ☐ `Sidebar`
* ☐ `Header`

### Typography

* ☐ `Heading`
* ☐ `Text`
* ☐ `Label`

### Controls

* ☐ `Button`
* ☐ `IconButton`
* ☐ `Input`
* ☐ `Textarea`
* ☐ `Select`
* ☐ `Checkbox`
* ☐ `Switch`

### Feedback

* ☐ `Alert`
* ☐ `Badge`
* ☐ `Toast`
* ☐ `Spinner`
* ☐ `Skeleton`

### Data

* ☐ `Card`
* ☐ `Table`
* ☐ `EmptyState`
* ☐ `Avatar`

### Overlay

* ☐ `Modal`
* ☐ `Dropdown`
* ☐ `Tooltip`

---

# 12.1.3 Design Tokens

Определить единые токены:

```text
colors
spacing
radius
typography
shadows
breakpoints
z-index
```

Например:

```text
color.primary
color.background
color.surface
color.text
color.muted
color.error
color.success
```

Запрещено:

```tsx
<div style={{ color: "#..." }}>
```

по всему приложению без необходимости.

Цвета, размеры и отступы должны управляться через UI Kit / tokens.

---

# 12.1.4 Component States

Компоненты должны поддерживать необходимые состояния:

```text
default
hover
focus
active
disabled
loading
error
```

Особенно:

* Button;
* Input;
* Select;
* Dropdown;
* Modal.

---

# 12.1.5 Responsive Layout

Приложение должно корректно работать минимум на:

```text
Mobile
Tablet
Desktop
```

Проверить:

* sidebar;
* header;
* forms;
* cards;
* dashboard widgets;
* таблицы.

Не должно появляться горизонтального overflow на стандартных разрешениях.

---

# 12.1.6 Accessibility

Минимальные требования:

* ☐ Все интерактивные элементы доступны с клавиатуры.
* ☐ Focus state присутствует.
* ☐ Кнопки имеют понятные названия.
* ☐ Input связан с Label.
* ☐ Modal корректно обрабатывает focus.
* ☐ Используются семантические HTML-элементы.
* ☐ Ошибки форм доступны пользователю.

---

# 12.1.7 Application Layout

Создать основной layout:

```text
┌──────────────────────────────────────┐
│ Header                               │
├────────────┬─────────────────────────┤
│            │                         │
│ Sidebar    │ Main Content            │
│            │                         │
│ Dashboard  │                         │
│ Projects   │                         │
│ Reports    │                         │
│ Chat       │                         │
│ Settings   │                         │
│            │                         │
└────────────┴─────────────────────────┘
```

На мобильных:

```text
Header

↓

Main Content

↓

Mobile Navigation / Drawer
```

---

# 12.1.8 Routing

Настроить React Router.

Основные маршруты:

```text
/login
/register

/dashboard

/projects
/reports
/chat
/settings
```

На этом этапе реализовать функционально:

```text
/login
/register
/dashboard
```

Остальные маршруты можно зарегистрировать как placeholders до соответствующих этапов.

---

# 12.1.9 Protected Routes

Создать:

```text
ProtectedRoute
```

Flow:

```text
Request Route

↓

Authenticated?

├── YES → Page
│
└── NO → /login
```

---

Проверить:

* ☐ Авторизованный пользователь не попадает на Login без причины.
* ☐ Неавторизованный пользователь не получает Dashboard.
* ☐ После logout защищённые страницы недоступны.

---

# 12.1.10 Authentication UI

Создать страницы:

```text
pages/auth/

├── LoginPage
└── RegisterPage
```

---

# 12.1.11 Login

Форма:

```text
Email

Password

[ Login ]
```

Дополнительно:

```text
Forgot password
```

может быть подготовлен как placeholder для будущей реализации.

---

Состояния:

```text
idle
loading
success
error
```

---

При ошибке API:

```text
Invalid credentials
```

необходимо показать понятное сообщение пользователю.

Не показывать внутренний stack trace или технические детали.

---

# 12.1.12 Registration

Форма:

```text
Email

Password

Confirm Password

[ Create account ]
```

Проверять:

* корректность email;
* минимальную длину password;
* совпадение паролей;
* обязательность полей.

---

После успешной регистрации:

```text
Register

↓

Login / Auto Login

↓

Dashboard
```

Конкретный сценарий должен соответствовать API-контракту Backend.

---

# 12.1.13 Authentication State

Создать frontend auth state:

```text
AuthStore
```

Хранить:

```text
user
isAuthenticated
isLoading
```

Не дублировать backend source of truth.

---

Если используется refresh token:

Frontend должен корректно обрабатывать:

```text
Access Token expired

↓

Refresh

↓

Retry request
```

Если refresh невозможен:

```text
Logout

↓

Login
```

---

# 12.1.14 API Layer

Использовать SDK из:

```text
packages/sdk
```

или существующий API abstraction layer.

Не писать:

```typescript
fetch("/api/...")
```

в каждом React-компоненте.

Должна быть единая точка взаимодействия с Backend.

---

# 12.1.15 Auth API Integration

Frontend должен использовать реальные endpoints:

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /users/me
```

Конкретные пути должны соответствовать фактическому Swagger/OpenAPI контракту проекта.

---

# 12.1.16 Dashboard

Создать:

```text
pages/dashboard/
```

Dashboard должен стать основной стартовой страницей пользователя.

---

Структура:

```text
Dashboard

├── Welcome
│
├── Statistics
│
├── Recent Projects
│
├── Recent Analyses
│
└── Quick Actions
```

---

# 12.1.17 Dashboard Statistics

Подготовить карточки:

```text
Projects

Analyses

Reports

Average Score
```

Пример:

```text
┌─────────────┐
│ Projects    │
│ 12          │
└─────────────┘

┌─────────────┐
│ Analyses    │
│ 37          │
└─────────────┘
```

Данные должны приходить с Backend.

Не использовать hardcoded:

```text
12
37
85
```

как финальную реализацию.

---

# 12.1.18 Recent Projects

Показать последние проекты:

```text
Project

Last Analysis

Score

Updated
```

Например:

```text
Reviewsha
Score: 87
Updated: 2h ago
```

---

Действие:

```text
View Project
```

будет вести на будущий Projects Module.

---

# 12.1.19 Recent Analyses

Показать:

* название проекта;
* дату;
* статус;
* score.

Статусы:

```text
QUEUED
PROCESSING
COMPLETED
FAILED
```

Визуально использовать `Badge` из UI Kit.

---

# 12.1.20 Quick Actions

Добавить основные действия:

```text
[ New Project ]

[ Upload Project ]

[ View Reports ]
```

До реализации соответствующих страниц действия могут быть disabled или вести на подготовленные маршруты.

---

# 12.1.21 Loading States

Каждый запрос Dashboard должен иметь loading state.

Использовать:

```text
Skeleton
```

а не просто пустой экран.

Например:

```text
Loading...

┌─────────────┐
│ ████████    │
│ █████       │
└─────────────┘
```

---

# 12.1.22 Empty States

Если пользователь новый:

```text
No projects yet
```

и:

```text
Create your first project
```

Если анализов нет:

```text
No analyses yet
```

---

# 12.1.23 Error States

Если Backend недоступен:

```text
Unable to load dashboard
[ Retry ]
```

Не должно быть:

```text
undefined
NaN
500 Internal Server Error
```

в пользовательском интерфейсе.

---

# 12.1.24 Notifications

Подключить Toast систему.

Использовать для:

* успешного login;
* регистрации;
* logout;
* ошибок API;
* обновления данных.

---

# 12.1.25 User Menu

В Header добавить:

```text
Avatar

User Name / Email

↓

Profile
Settings
Logout
```

На этом этапе достаточно реализовать:

* отображение текущего пользователя;
* Logout.

Settings реализуется позднее.

---

# 12.1.26 Logout

Flow:

```text
Click Logout

↓

API logout

↓

Clear Auth State

↓

Clear relevant cache

↓

/login
```

После logout:

* токены недоступны приложению;
* protected routes закрыты;
* пользовательские данные не остаются в UI state.

---

# 12.1.27 Server State

Для данных Dashboard использовать выбранный механизм server state.

Например:

```text
TanStack Query
```

или существующий abstraction проекта.

Разделить:

```text
Server State

vs

Client State
```

Не хранить все API-данные в глобальном auth store.

---

# 12.1.28 Frontend Error Boundary

Добавить глобальный Error Boundary.

При критической ошибке:

```text
Something went wrong.

[ Reload ]
```

В production не показывать stack trace.

---

# 12.1.29 Environment Configuration

Создать:

```text
.env.example
```

Например:

```text
VITE_API_URL=
```

Проверить:

* ☐ URL API не захардкожен.
* ☐ Production и development используют разные настройки.
* ☐ Secrets не находятся в frontend ENV.

Важно: всё, что попадает в `VITE_*`, потенциально доступно пользователю браузера и **не является секретом**.

---

# 12.1.30 Testing

## UI Kit Unit Tests

Минимум **40+ тестов**.

Покрыть:

* Button;
* Input;
* Select;
* Modal;
* Badge;
* Card;
* Toast;
* Loading;
* EmptyState;
* основные layout-компоненты.

Проверять:

* rendering;
* props;
* states;
* events;
* accessibility.

---

# 12.1.31 Auth Tests

Минимум **30+ тестов**.

Проверить:

* ☐ Login success.
* ☐ Login error.
* ☐ Registration success.
* ☐ Registration validation.
* ☐ Password mismatch.
* ☐ Auth state.
* ☐ Protected route.
* ☐ Logout.
* ☐ Expired access token.
* ☐ Refresh flow.

---

# 12.1.32 Dashboard Tests

Минимум **25+ тестов**.

Проверить:

* ☐ Dashboard rendering.
* ☐ Statistics.
* ☐ Recent projects.
* ☐ Recent analyses.
* ☐ Loading.
* ☐ Empty state.
* ☐ Error state.
* ☐ Retry.
* ☐ Quick actions.

---

# 12.1.33 Integration Tests

Минимум **20+ тестов**.

Проверить:

```text
React

↓

SDK/API

↓

Mock Backend
```

Покрыть:

* login;
* register;
* current user;
* dashboard;
* logout;
* refresh.

---

# 12.1.34 E2E Tests

Минимум **12 сценариев**.

### Authentication

* ☐ Открытие Login.
* ☐ Успешный Login.
* ☐ Неверный пароль.
* ☐ Регистрация.
* ☐ Logout.
* ☐ Попытка открыть Dashboard без авторизации.

### Dashboard

* ☐ Открытие Dashboard.
* ☐ Загрузка статистики.
* ☐ Отображение проектов.
* ☐ Отображение анализов.
* ☐ Empty Dashboard.
* ☐ Ошибка API + Retry.

---

# 12.1.35 Manual Testing

Проверить вручную:

## Desktop

* ☐ 1920×1080.
* ☐ 1440×900.
* ☐ 1280×720.

## Mobile

* ☐ 390×844.
* ☐ 375×667.

## Auth

* ☐ Login.
* ☐ Register.
* ☐ Logout.
* ☐ Refresh страницы после Login.
* ☐ Истёкший access token.

## Dashboard

* ☐ Новый пользователь.
* ☐ Пользователь с проектами.
* ☐ Пользователь с анализами.
* ☐ Loading.
* ☐ Error.
* ☐ Empty state.

---

# 12.1.36 Документация

Обновить:

```text
10-frontend.md
11-api-contracts.md
```

Добавить:

* Frontend architecture;
* routing;
* auth flow;
* state management;
* UI Kit;
* Dashboard data flow.

---

# 12.1.37 Архитектурная проверка

Проверить соответствие:

```text
PRD
 ↓
Architecture
 ↓
Backend API
 ↓
SDK
 ↓
Frontend
```

Особенно проверить:

* ☐ UI соответствует PRD.
* ☐ Routes соответствуют архитектуре.
* ☐ API соответствует Backend.
* ☐ Используются общие типы.
* ☐ Не появились frontend-only модели, противоречащие Backend.
* ☐ Не появились временные mock API в production-коде.

---

# Финальный чек-лист

## UI Kit

* ☐ Создан и подключён `packages/ui`.
* ☐ Базовые компоненты реализованы.
* ☐ Design Tokens определены.
* ☐ States реализованы.
* ☐ Responsive работает.
* ☐ Accessibility проверена.

## Authentication

* ☐ Login.
* ☐ Register.
* ☐ Logout.
* ☐ Auth state.
* ☐ Protected routes.
* ☐ Refresh token flow.
* ☐ Реальный Backend API.

## Dashboard

* ☐ Dashboard реализован.
* ☐ Statistics.
* ☐ Recent Projects.
* ☐ Recent Analyses.
* ☐ Quick Actions.
* ☐ Loading.
* ☐ Empty.
* ☐ Error states.

## Архитектура

* ☐ Используется SDK/API layer.
* ☐ Server state отделён от client state.
* ☐ Нет бизнес-логики в UI-компонентах.
* ☐ Нет hardcoded production data.
* ☐ ENV настроен корректно.

## Quality

* ☐ Unit tests.
* ☐ Integration tests.
* ☐ E2E tests.
* ☐ Manual testing.
* ☐ Accessibility testing.
* ☐ Responsive testing.
* ☐ Документация обновлена.

---

# Критерий завершения

**12.1 считается завершённым**, когда пользователь может открыть Web-приложение, зарегистрироваться или войти, получить защищённую сессию, попасть на Dashboard и увидеть реальные данные своего аккаунта и проектов.

При этом UI должен быть построен на общем `packages/ui`, API — через существующий SDK/API layer, маршруты — защищены, а состояния **loading / empty / error / success** обработаны без временных mock-данных.

Иными словами:

```text
UI Kit
   ↓
Auth
   ↓
Protected Application
   ↓
Dashboard
   ↓
Real Backend API
```

Это становится фундаментом для следующих частей Frontend: **Projects, Upload, Analysis, Reports и Chat**.


--- SOURCE: pasted-text-2.txt ---

# 12.2 User Features (Projects, Upload, Analysis, Reports, Chat, Settings)

**Статус:** ⏳ TODO

## Цель этапа

Реализовать основной пользовательский функционал Web-приложения поверх уже готовых:

* UI Kit;
* авторизации;
* Dashboard;
* Backend API;
* SDK;
* Projects Module;
* Upload Pipeline;
* AI Pipeline;
* Reports;
* Chat.

После завершения `12.2` пользователь должен пройти практически весь основной пользовательский сценарий:

```text
Login
  ↓
Dashboard
  ↓
Create Project
  ↓
Upload ZIP
  ↓
Start Analysis
  ↓
Processing
  ↓
Analysis Result
  ↓
Report
  ↓
Compare History
  ↓
AI Chat
  ↓
Settings
```

---

# 12.2.1 Projects

Создать полноценный пользовательский интерфейс управления проектами.

## Страницы

```text
/projects
/projects/:projectId
/projects/:projectId/settings
```

---

## Projects List

Отображать:

* название;
* описание;
* теги;
* статус;
* последний анализ;
* score;
* дату обновления.

Добавить:

* поиск;
* фильтрацию;
* сортировку;
* пагинацию.

Состояния:

* loading;
* empty;
* error;
* success.

---

## Создание проекта

Форма:

```text
Name
Description
Tags

[Create Project]
```

Валидация должна соответствовать Backend DTO.

После создания:

```text
Create
 ↓
Project
 ↓
Project Page
```

---

## Project Page

Основные блоки:

```text
Project Header

Overview

Latest Analysis

Files / Versions

Reports

Chat
```

Подготовить навигацию между разделами проекта.

---

## Редактирование

Пользователь должен иметь возможность:

* изменить название;
* изменить описание;
* изменить теги.

Использовать реальные API.

---

## Архивирование

Добавить:

```text
Archive Project
```

Перед архивацией показать confirmation modal.

После архивирования:

* проект получает соответствующий статус;
* обычные операции блокируются согласно Backend policy;
* проект остаётся доступен в архиве.

---

# 12.2.2 Upload

Реализовать UI загрузки проекта.

## Upload Flow

```text
Select ZIP

↓

Validate

↓

Upload

↓

Progress

↓

Create Version

↓

Ready for Analysis
```

---

## Upload Component

Поддержать:

* drag & drop;
* выбор файла;
* отображение имени;
* размер;
* прогресс;
* отмену;
* retry.

---

## Client Validation

До отправки проверить:

* расширение;
* размер;
* наличие файла.

Но **client validation не заменяет ZIP validation на Backend**.

---

## Upload Progress

Отображать:

```text
Uploading...

████████████░░░░ 75%
```

После завершения:

```text
Upload complete
```

---

## Ошибки

Обработать:

* слишком большой файл;
* неправильный формат;
* повреждённый ZIP;
* network error;
* timeout;
* storage error.

Сообщение должно быть понятным пользователю.

---

# 12.2.3 Versions

После загрузки показать версии проекта:

```text
Version 1
Version 2
Version 3
```

Для каждой:

* номер;
* дата;
* размер;
* статус;
* автор;
* результат анализа.

Действия:

```text
View
Analyze
Download
```

если соответствующее действие разрешено API.

---

# 12.2.4 Analysis

Создать основной Analysis UI.

## Start Analysis

Кнопка:

```text
[ Analyze Project ]
```

Перед запуском показать:

* выбранную версию;
* размер проекта;
* приблизительное состояние.

---

После запуска:

```text
QUEUED
   ↓
DOWNLOADING
   ↓
EXTRACTING
   ↓
PARSING
   ↓
ANALYZING
   ↓
MERGING
   ↓
GENERATING REPORT
   ↓
COMPLETED
```

Frontend должен отображать реальный статус Backend.

---

# 12.2.5 Analysis Progress

Создать компонент:

```text
AnalysisProgress
```

Показывать:

* текущий этап;
* общий статус;
* прогресс, если Backend его предоставляет;
* elapsed time;
* ошибки.

Например:

```text
Analysis in progress

✓ Download
✓ Extract
✓ Parse
● AI Analysis
○ Merge
○ Report
```

Не придумывать процент прогресса, если Backend его не предоставляет.

---

# 12.2.6 Analysis Result

После завершения:

```text
Analysis completed
```

Показать:

* общий Score;
* количество проблем;
* severity breakdown;
* summary;
* основные рекомендации.

Например:

```text
Score: 84

Critical   2
High       5
Medium    12
Low         8
```

---

# 12.2.7 Findings

Создать интерфейс найденных проблем.

Каждая проблема:

```text
Severity
Title
Description
File
Line
Recommendation
```

Добавить:

* фильтрацию по severity;
* поиск;
* сортировку.

---

## Finding Details

При открытии проблемы:

```text
Problem

Why it matters

Location

Code context

Recommendation
```

Если Backend предоставляет конкретный фрагмент кода — отображать его в code block с syntax highlighting.

---

# 12.2.8 Reports

Интегрировать Reports UI.

На странице проекта:

```text
Reports
```

Показывать:

* дату;
* score;
* статус;
* версию проекта.

---

## Report Details

Страница:

```text
/reports/:reportId
```

Содержит:

* Summary;
* Score;
* Findings;
* Recommendations;
* Analysis metadata.

---

## Export

Добавить кнопки:

```text
[ Markdown ]
[ PDF ]
[ JSON ]
```

Использовать реальные API endpoints.

Скачивание должно работать непосредственно из браузера.

---

# 12.2.9 Reports History

Страница истории:

```text
/projects/:projectId/reports
```

Показывать:

```text
Version | Score | Date | Status
```

Поддержать:

* пагинацию;
* сортировку;
* фильтр.

---

# 12.2.10 Compare

Добавить выбор двух анализов:

```text
Compare:

Version 3
vs
Version 2

[Compare]
```

Результат:

```text
Score

New Issues

Resolved Issues

Severity Changes
```

Например:

```text
Score
78 → 86

Resolved
12

New
3
```

---

# 12.2.11 Chat

Интегрировать Backend Chat Module.

Страница:

```text
/projects/:projectId/chat
```

---

## Chat Layout

```text
┌──────────────────────────────────────┐
│ Project Chat                         │
├────────────┬─────────────────────────┤
│ Sessions   │ Messages                │
│            │                         │
│ Chat 1     │ User                    │
│ Chat 2     │                         │
│ Chat 3     │ AI                      │
│            │                         │
│ + New Chat │                         │
├────────────┴─────────────────────────┤
│ Message...                [Send]      │
└──────────────────────────────────────┘
```

---

## Sessions

Поддержать:

* создание;
* открытие;
* удаление;
* список;
* последнее сообщение;
* дату изменения.

---

## Messages

Отображать:

* user message;
* assistant message;
* timestamp.

Поддержать Markdown в ответах AI.

---

# 12.2.12 Chat Streaming

Подключить Streaming API из `11.2`.

Flow:

```text
Send

↓

SSE

↓

Token

↓

Render

↓

Complete
```

Во время генерации:

```text
AI is typing...
```

Ответ должен появляться постепенно.

---

## Chat Controls

Поддержать:

* отправку;
* отмену генерации;
* retry;
* очистку input;
* auto-scroll.

Не отправлять пустые сообщения.

---

# 12.2.13 Chat Context Indicators

Если Backend предоставляет информацию о контексте, отображать:

```text
Context:
Project
Latest Analysis
Report
```

Это поможет пользователю понимать, на основе каких данных AI отвечает.

---

# 12.2.14 Settings

Создать:

```text
/settings
```

Основные секции:

```text
Profile

Security

Preferences
```

---

## Profile

Показать:

* email;
* имя, если предусмотрено;
* дату регистрации.

Разрешить изменение доступных профилем полей.

---

## Security

Добавить:

* изменение пароля;
* logout;
* logout from all sessions, если поддерживается Backend.

Не хранить пароль на Frontend.

---

## Preferences

Подготовить:

* theme;
* language;
* уведомления.

Если Backend ещё не поддерживает эти настройки, frontend должен чётко отделять локальные preferences от серверных.

---

# 12.2.15 Navigation

Основное меню:

```text
Dashboard
Projects
Reports
Chat
Settings
```

Для project-specific действий использовать отдельную навигацию проекта:

```text
Overview
Versions
Analysis
Reports
Chat
```

---

# 12.2.16 Server State

Использовать существующий API/SDK layer и механизм server state.

Не хранить:

```text
projects
reports
messages
analyses
```

вручную в нескольких независимых глобальных store.

После mutation:

```text
Create Project
     ↓
Invalidate Projects

Upload
     ↓
Invalidate Versions

Analysis
     ↓
Invalidate Analysis / Reports
```

---

# 12.2.17 Optimistic Updates

Использовать только там, где операция безопасна:

Подходящие кандидаты:

* изменение названия;
* изменение описания;
* изменение UI preferences.

Не использовать optimistic update для:

* Upload;
* Analysis;
* Archive;
* Report generation.

---

# 12.2.18 Global Error Handling

Все API ошибки привести к единому frontend-формату.

Пользователь должен получать:

```text
Something went wrong.

[Retry]
```

или конкретное сообщение:

```text
The ZIP file is too large.
Maximum size: 100 MB.
```

Не показывать raw backend errors.

---

# 12.2.19 Permissions

Frontend должен учитывать:

* authenticated user;
* project ownership;
* archived project;
* доступность операции.

Но frontend permissions — только UX-слой.

**Backend остаётся источником истины для authorization.**

---

# 12.2.20 Responsive Design

Обеспечить работу:

### Desktop

* полноценный sidebar;
* таблицы;
* двухколоночный chat.

### Tablet

* адаптивные таблицы;
* collapsed navigation.

### Mobile

* drawer navigation;
* карточки вместо широких таблиц;
* chat в одну колонку;
* upload без drag & drop как обязательного механизма.

---

# 12.2.21 Accessibility

Проверить:

* keyboard navigation;
* focus states;
* semantic buttons;
* labels;
* modal focus;
* accessible errors;
* screen-reader-friendly status updates.

Особенно важно для:

* Upload;
* Analysis Progress;
* Chat Streaming;
* Modals.

---

# 12.2.22 Loading / Empty / Error States

Каждая feature должна иметь минимум:

```text
Loading
Empty
Error
Success
```

### Projects

```text
No projects yet
[Create Project]
```

### Reports

```text
No reports yet
```

### Chat

```text
No conversations
[New Chat]
```

### Upload

```text
Drop ZIP here
```

### Analysis

```text
Analysis hasn't started
[Analyze Project]
```

---

# 12.2.23 API Integration

Все функции должны работать через существующий API contract.

Проверить интеграцию:

```text
Projects API
Upload API
Analysis API
Reports API
Chat API
Settings/Auth API
```

Не создавать frontend endpoints, которых нет в Backend contract.

Если API требует изменения — сначала обновить контракт и SDK.

---

# 12.2.24 Полный User Flow

Обязательно проверить сквозной сценарий:

```text
Register
 ↓
Login
 ↓
Dashboard
 ↓
Create Project
 ↓
Upload ZIP
 ↓
Create Version
 ↓
Start Analysis
 ↓
Wait Processing
 ↓
View Result
 ↓
Open Report
 ↓
Download PDF
 ↓
Open History
 ↓
Compare Reports
 ↓
Open Chat
 ↓
Ask Question
 ↓
Receive Streaming Answer
 ↓
Open Settings
 ↓
Logout
```

Это главный acceptance flow данного подпункта.

---

# 12.2.25 Автоматические тесты

Поскольку тестирование пишется по ходу разработки, для `12.2` тесты должны создаваться вместе с каждой feature.

## Unit / Component

Ориентир: **100+ тестов**

Распределение примерно:

| Feature  | Тесты |
| -------- | ----: |
| Projects |   20+ |
| Upload   |   15+ |
| Analysis |   20+ |
| Reports  |   15+ |
| Chat     |   20+ |
| Settings |   10+ |

Проверять:

* rendering;
* user interactions;
* validation;
* loading;
* errors;
* empty states;
* permissions;
* state transitions.

---

# 12.2.26 Integration Tests

Ориентир: **50+ тестов**

Проверить:

* Projects API integration;
* Upload API;
* Analysis API;
* Reports API;
* Chat API;
* Settings/Auth API;
* cache invalidation;
* polling/streaming;
* error handling.

---

# 12.2.27 E2E

Ориентир: **25+ сценариев**.

Основные:

### Projects

* ☐ Create project.
* ☐ Edit project.
* ☐ Archive project.
* ☐ Search project.

### Upload

* ☐ Upload valid ZIP.
* ☐ Reject invalid ZIP.
* ☐ Upload progress.
* ☐ Retry failed upload.

### Analysis

* ☐ Start analysis.
* ☐ Observe processing.
* ☐ Completed analysis.
* ☐ Failed analysis.

### Reports

* ☐ Open report.
* ☐ Download Markdown.
* ☐ Download PDF.
* ☐ Download JSON.
* ☐ History.
* ☐ Compare.

### Chat

* ☐ Create session.
* ☐ Send message.
* ☐ Receive streaming response.
* ☐ Cancel generation.
* ☐ Restore history.

### Settings

* ☐ Open settings.
* ☐ Update profile.
* ☐ Change password.
* ☐ Logout.

---

# 12.2.28 Manual QA

Обязательно вручную пройти полный сценарий:

```text
Register
→ Login
→ Create Project
→ Upload
→ Analyze
→ Report
→ Compare
→ Chat
→ Settings
→ Logout
```

Проверить минимум:

* desktop;
* tablet;
* mobile.

Особенно проверить реальные состояния:

* медленный интернет;
* отключение API;
* ошибка Upload;
* ошибка Analysis;
* ошибка AI;
* закрытие страницы во время анализа;
* обновление страницы во время Chat Streaming;
* повторное открытие проекта.

---

# 12.2.29 Документация

Обновить:

```text
docs/architecture/10-frontend.md
docs/architecture/11-api-contracts.md
docs/architecture/13-sequence.md
```

Зафиксировать:

* frontend feature architecture;
* routes;
* project flow;
* upload flow;
* analysis flow;
* reports flow;
* chat flow;
* settings;
* API integration;
* state management.

При существенных изменениях обновить frontend-related диаграммы.

---

# Финальный чек-лист

## Projects

* ☐ Список проектов.
* ☐ Создание.
* ☐ Редактирование.
* ☐ Архивация.
* ☐ Теги.
* ☐ Поиск/фильтрация.
* ☐ Project Details.

## Upload

* ☐ ZIP upload.
* ☐ Drag & Drop.
* ☐ Validation.
* ☐ Progress.
* ☐ Retry.
* ☐ Versions.

## Analysis

* ☐ Запуск.
* ☐ Processing status.
* ☐ Progress.
* ☐ Result.
* ☐ Findings.
* ☐ Filters.

## Reports

* ☐ Report page.
* ☐ History.
* ☐ Compare.
* ☐ Markdown.
* ☐ PDF.
* ☐ JSON.

## Chat

* ☐ Sessions.
* ☐ History.
* ☐ Context.
* ☐ Streaming.
* ☐ Cancel.
* ☐ Retry.
* ☐ Markdown responses.

## Settings

* ☐ Profile.
* ☐ Security.
* ☐ Preferences.
* ☐ Logout.

## Архитектура

* ☐ Используется SDK/API layer.
* ☐ Используются shared types.
* ☐ UI строится на `packages/ui`.
* ☐ Нет дублирования API logic.
* ☐ Нет production mock data.
* ☐ Backend остаётся источником authorization.
* ☐ Server state отделён от client state.

## Quality

* ☐ Component tests.
* ☐ Integration tests.
* ☐ E2E tests.
* ☐ Manual QA.
* ☐ Responsive QA.
* ☐ Accessibility QA.
* ☐ Документация обновлена.

---

# Критерий завершения

**12.2 считается завершённым**, когда пользователь может полностью пользоваться основным продуктовым циклом через Web-приложение:

```text
Project
   ↓
Upload
   ↓
Analysis
   ↓
Report
   ↓
History / Compare
   ↓
AI Chat
```

и управлять своим аккаунтом через Settings.

При этом все операции работают через реальные Backend API, используются существующие shared packages и SDK, а UI корректно обрабатывает **loading / empty / error / success**, авторизацию, permissions, streaming и responsive layout.

После этого **этап 12 Frontend** можно считать функционально завершённым, а следующие работы уже в основном относятся к **Admin Panel, SDK, Logging, инфраструктуре и финальному QA**.


--- SOURCE: pasted-text-9.txt ---

# Этап 13 — Admin Panel: чек-лист сверки

Цель проверки — убедиться, что Admin Panel является **полноценным административным интерфейсом**, работает через реальные Backend API, соблюдает RBAC и даёт администратору контроль над пользователями, проектами, очередями, логами и AI usage.

Архитектура:

```text
Admin Panel
     ↓
@reviewsha/sdk
     ↓
Admin API
     ↓
Backend
 ├── Users
 ├── Projects
 ├── Queues
 ├── Logs
 ├── AI Usage
 └── Statistics
```

---

# 13.1 Admin Core

## Admin Application

* ☐ `apps/admin` существует как отдельное приложение.
* ☐ React + Vite scaffold корректно работает.
* ☐ Используется общий `packages/ui`.
* ☐ Используется общий `@reviewsha/sdk`.
* ☐ API URL берётся из environment.
* ☐ Нет hardcoded production URLs.
* ☐ Нет production mock data.
* ☐ Admin не обращается напрямую к Redis/PostgreSQL/MinIO.
* ☐ Admin работает только через Backend API.

---

# Авторизация

## Login

* ☐ Admin login реализован.
* ☐ Используется общий Auth flow проекта.
* ☐ Access token корректно передаётся API.
* ☐ Refresh token flow работает.
* ☐ Logout работает.
* ☐ Session восстанавливается после перезагрузки.

Проверить:

```text
Login
 ↓
Access Token
 ↓
Admin API
 ↓
Admin Dashboard
```

---

# RBAC

Это **критическая часть этапа**.

Проверить:

```text
USER
 ↓
Admin route
 ↓
403 / redirect
```

и:

```text
ADMIN
 ↓
Admin route
 ↓
Access
```

* ☐ Backend проверяет роль.
* ☐ Frontend скрывает недоступные разделы.
* ☐ Но безопасность НЕ зависит только от frontend.
* ☐ Прямой API request от USER → 403.
* ☐ Нельзя подменить роль через DevTools.
* ☐ Admin endpoints используют существующие Guards/Roles.

---

# Admin Routing

Проверить routes:

```text
/admin/login
/admin
/admin/users
/admin/projects
/admin/queues
/admin/logs
/admin/ai-usage
/admin/statistics
```

если именно такая структура предусмотрена проектом.

* ☐ Protected admin routes.
* ☐ `/admin/login` доступен без session.
* ☐ Остальные routes требуют auth.
* ☐ USER не может попасть в Admin.
* ☐ Unknown route → 404.
* ☐ Navigation работает.

---

# Dashboard

* ☐ Главная Admin страница существует.
* ☐ Отображаются реальные данные.
* ☐ Users statistics.
* ☐ Projects statistics.
* ☐ Analysis/processing statistics.
* ☐ Queue status.
* ☐ AI usage summary.
* ☐ Loading state.
* ☐ Empty state.
* ☐ Error state.
* ☐ Данные не захардкожены.

---

# 13.1 Users

## Users List

* ☐ Список пользователей.
* ☐ Pagination.
* ☐ Search.
* ☐ Filters, если предусмотрены API.
* ☐ Loading.
* ☐ Empty.
* ☐ Error.

Проверить:

```text
Users
 ↓
Search
 ↓
Filter
 ↓
Open User
```

---

## User Details

* ☐ User ID.
* ☐ Email/username согласно PRD.
* ☐ Role.
* ☐ Status.
* ☐ Created date.
* ☐ Другие разрешённые данные.

Не отображать секретные данные:

* ☐ password;
* ☐ refresh token;
* ☐ API secrets;
* ☐ internal credentials.

---

## User Management

Если предусмотрено Backend API:

* ☐ Изменение роли.
* ☐ Изменение статуса.
* ☐ Block/disable.
* ☐ Restore.
* ☐ Другие административные операции.

Для опасных операций:

```text
Click
 ↓
Confirmation
 ↓
Mutation
 ↓
Success
 ↓
Invalidate cache
```

---

# 13.1 Projects

## Projects List

* ☐ Все доступные администратору проекты.
* ☐ Pagination.
* ☐ Search.
* ☐ Filters.
* ☐ Status.
* ☐ Owner.
* ☐ Created date.
* ☐ Loading.
* ☐ Empty.
* ☐ Error.

---

## Project Details

Проверить:

* ☐ Project metadata.
* ☐ Owner.
* ☐ Version.
* ☐ Status.
* ☐ Tags.
* ☐ Analysis status.
* ☐ History, если предусмотрена Admin API.

---

## Project Administration

Если предусмотрено:

* ☐ Archive.
* ☐ Restore.
* ☐ Delete.
* ☐ Other moderation/admin actions.

Все destructive actions:

* ☐ требуют подтверждения;
* ☐ показывают результат;
* ☐ корректно обрабатывают ошибку;
* ☐ обновляют cache.

---

# 13.2 Administration

# Queues

Admin должен видеть состояние очередей **через Backend**, а не подключаться непосредственно к Redis.

```text
Admin
 ↓
Queue API
 ↓
BullMQ
 ↓
Redis
```

Проверить:

* ☐ Queue list.
* ☐ Queue status.
* ☐ Waiting jobs.
* ☐ Active jobs.
* ☐ Completed jobs.
* ☐ Failed jobs.
* ☐ Delayed jobs.
* ☐ Job details.

---

# Job Management

Если предусмотрено API:

* ☐ View job.
* ☐ Retry failed job.
* ☐ Remove job.
* ☐ Inspect error.
* ☐ Inspect attempts.

Проверить:

```text
Failed Job
    ↓
Retry
    ↓
Queue
    ↓
Worker
```

и что UI показывает актуальное состояние.

---

# Queue Security

* ☐ USER не имеет доступа.
* ☐ Admin API защищён RBAC.
* ☐ Нельзя передать произвольный Redis command.
* ☐ Admin не получает Redis credentials.
* ☐ Нельзя управлять queue через frontend напрямую.

---

# Logs

## Logs List

* ☐ Реальные backend/worker logs.
* ☐ Pagination.
* ☐ Search.
* ☐ Filters.
* ☐ Level.
* ☐ Service.
* ☐ Date/time.
* ☐ Request ID, если предусмотрен.
* ☐ Loading.
* ☐ Empty.
* ☐ Error.

---

## Log Details

Проверить:

* ☐ Timestamp.
* ☐ Level.
* ☐ Service.
* ☐ Message.
* ☐ Context.
* ☐ Request ID.
* ☐ Error information.

При этом:

* ☐ passwords не отображаются;
* ☐ tokens не отображаются;
* ☐ secrets не отображаются;
* ☐ sensitive user data не раскрывается без необходимости.

---

# AI Usage

## Usage Dashboard

Проверить реальные данные:

* ☐ Requests.
* ☐ Tokens.
* ☐ Input tokens.
* ☐ Output tokens.
* ☐ Provider.
* ☐ Model.
* ☐ Cost, если предусмотрен.
* ☐ Time period.

---

## Filters

Проверить:

```text
Date
User
Project
Provider
Model
```

если эти фильтры предусмотрены API/PRD.

---

## Usage Details

* ☐ Можно определить, какой пользователь использовал AI.
* ☐ Можно определить проект.
* ☐ Можно определить provider/model.
* ☐ Token usage соответствует Backend.
* ☐ Frontend не пересчитывает критические финансовые показатели самостоятельно.

---

# Statistics

Проверить:

## Users

* ☐ Total.
* ☐ Active.
* ☐ New users.

## Projects

* ☐ Total.
* ☐ Active.
* ☐ Archived.

## Analysis

* ☐ Total.
* ☐ Successful.
* ☐ Failed.
* ☐ Processing.

## AI

* ☐ Requests.
* ☐ Tokens.
* ☐ Usage/cost.

## Queue

* ☐ Waiting.
* ☐ Active.
* ☐ Failed.

Все цифры должны приходить из Backend API.

---

# API Integration

Сверить Admin с `14.1–14.2`.

* ☐ Используется `@reviewsha/sdk`.
* ☐ OpenAPI актуален.
* ☐ Нет самостоятельных DTO.
* ☐ Нет собственного API client.
* ☐ Нет дублирования auth logic.
* ☐ Нет прямого `fetch()` без архитектурной причины.
* ☐ Errors централизованы.
* ☐ Pagination типизирована.

---

# State Management

Проверить разделение:

### Server State

* ☐ Users.
* ☐ Projects.
* ☐ Queues.
* ☐ Logs.
* ☐ AI usage.
* ☐ Statistics.

### UI State

* ☐ Filters.
* ☐ Modals.
* ☐ Selected user.
* ☐ Selected project.
* ☐ Confirmation dialogs.

Не должно быть нескольких источников истины для одного ресурса.

---

# Loading / Empty / Error

Каждый Admin раздел должен иметь:

```text
Loading
   ↓
Success
   ├── Data
   └── Empty
   ↓
Error
```

Проверить отдельно:

* ☐ Dashboard.
* ☐ Users.
* ☐ Projects.
* ☐ Queues.
* ☐ Logs.
* ☐ AI Usage.
* ☐ Statistics.

---

# Security

Провести **обязательную ручную проверку через API**, а не только UI.

## USER → Admin

```text
USER token
 ↓
GET /admin/users
 ↓
403
```

* ☐ Users API.
* ☐ Projects API.
* ☐ Queues API.
* ☐ Logs API.
* ☐ AI Usage API.
* ☐ Statistics API.

Все административные endpoints должны быть защищены.

---

## IDOR

Проверить:

```text
Admin
 ↓
/users/:id
```

и попытки получить/изменить запрещённые ресурсы.

Также проверить:

* ☐ project IDs;
* ☐ job IDs;
* ☐ log IDs;
* ☐ usage records.

---

# Destructive Operations

Для:

* ☐ delete user;
* ☐ disable user;
* ☐ delete project;
* ☐ archive;
* ☐ retry job;
* ☐ remove job;

проверить:

```text
Action
 ↓
Confirmation
 ↓
API
 ↓
Success/Error
 ↓
UI refresh
```

Не должно быть случайного действия по одному клику.

---

# Responsive / UX

Проверить:

* ☐ Desktop.
* ☐ Tablet.
* ☐ Mobile, если Admin должен поддерживать mobile.

Особое внимание:

* ☐ Tables.
* ☐ Filters.
* ☐ Sidebar.
* ☐ Job details.
* ☐ Log details.
* ☐ Modals.

---

# Accessibility

* ☐ Keyboard navigation.
* ☐ Focus.
* ☐ Labels.
* ☐ Table accessibility.
* ☐ Modal accessibility.
* ☐ Confirmation dialogs.
* ☐ Error announcements.
* ☐ Buttons имеют понятные labels.

---

# Performance

Особенно важно для Admin.

* ☐ Users pagination.
* ☐ Projects pagination.
* ☐ Logs pagination.
* ☐ Jobs pagination.
* ☐ Нет загрузки десятков тысяч записей.
* ☐ Filters работают server-side, если это предусмотрено.
* ☐ Нет постоянного агрессивного polling.
* ☐ Queue monitoring не создаёт тысячи запросов.
* ☐ Dashboard не делает лишние API requests.
* ☐ Charts не вызывают повторные загрузки без причины.

---

# Тесты

Так как тесты теперь пишутся **в процессе разработки**, к закрытию этапа должны быть покрыты критические административные сценарии.

## Unit / Component

Ориентир:

**50–70 тестов**

Покрыть:

* auth;
* RBAC UI;
* routing;
* users;
* projects;
* queues;
* logs;
* AI usage;
* statistics;
* tables;
* filters;
* forms;
* confirmation dialogs;
* loading/error/empty states.

---

# Integration

Ориентир:

**25–40 тестов**

Проверить:

```text
Admin UI
 ↓
Data Layer
 ↓
SDK
 ↓
Admin API
```

Минимум:

* ☐ Users.
* ☐ Projects.
* ☐ Queues.
* ☐ Logs.
* ☐ AI Usage.
* ☐ Statistics.
* ☐ Auth.

---

# E2E

Минимум **8–10 сценариев**.

### 1. Admin Login

```text
Login
 ↓
Admin Dashboard
```

### 2. USER denied

```text
USER
 ↓
/admin
 ↓
403 / redirect
```

### 3. Users

```text
Users
 ↓
Search
 ↓
Open
 ↓
Change status/role
```

### 4. Projects

```text
Projects
 ↓
Search
 ↓
Open
 ↓
Archive
```

### 5. Queues

```text
Queues
 ↓
Failed Jobs
 ↓
Open Job
 ↓
Retry
```

### 6. Logs

```text
Logs
 ↓
Filter
 ↓
Search
 ↓
Open details
```

### 7. AI Usage

```text
AI Usage
 ↓
Filter
 ↓
Inspect usage
```

### 8. Statistics

```text
Dashboard
 ↓
Statistics
 ↓
Verify data
```

---

# Manual QA

Пройти Admin как реальный администратор:

```text
Login
 ↓
Dashboard
 ↓
Users
 ↓
Projects
 ↓
Queues
 ↓
Logs
 ↓
AI Usage
 ↓
Statistics
 ↓
Logout
```

Проверить отдельно:

* ☐ refresh страницы;
* ☐ direct URL navigation;
* ☐ expired token;
* ☐ logout;
* ☐ API unavailable;
* ☐ slow API;
* ☐ empty database;
* ☐ failed queue;
* ☐ failed job;
* ☐ отсутствие прав.

---

# Negative QA

Обязательно:

* ☐ wrong password;
* ☐ expired access token;
* ☐ invalid refresh;
* ☐ USER access;
* ☐ 403;
* ☐ 404;
* ☐ 409;
* ☐ 500;
* ☐ network failure;
* ☐ retry failed job;
* ☐ delete/disable confirmation;
* ☐ попытка открыть чужой resource ID.

---

# Документация

Проверить:

```text
docs/architecture/10-frontend.md
docs/architecture/11-api-contracts.md
```

Если Admin архитектура описана отдельно — соответствующий документ также.

Зафиксировать:

* ☐ Admin routes.
* ☐ RBAC.
* ☐ Admin API.
* ☐ Users management.
* ☐ Projects management.
* ☐ Queue monitoring.
* ☐ Logs.
* ☐ AI usage.
* ☐ Statistics.
* ☐ Security model.

Если реализация отличается от архитектуры:

* ☐ обновить документацию;
* ☐ обновить API contract;
* ☐ обновить диаграммы при необходимости.

---

# Итоговый критерий закрытия этапа 13

Этап 13 можно считать **COMPLETE**, когда работает:

```text
                    ADMIN
                      │
             ┌────────┴────────┐
             ↓                 ↓
          Auth/RBAC         Dashboard
             │                 │
     ┌───────┼───────┐   ┌─────┼──────┐
     ↓       ↓       ↓   ↓     ↓      ↓
   Users  Projects Queues Logs AI Usage Stats
```

И выполнены все ключевые условия:

* ☐ Admin — отдельное рабочее приложение.
* ☐ Login/Logout работает.
* ☐ RBAC реально защищает Backend.
* ☐ USER не имеет Admin доступа.
* ☐ Users работают.
* ☐ Projects работают.
* ☐ Queue monitoring работает.
* ☐ Job management работает, если предусмотрен API.
* ☐ Logs работают.
* ☐ AI Usage работает.
* ☐ Statistics работают.
* ☐ Все данные реальные.
* ☐ Используется SDK.
* ☐ Нет прямого доступа к Redis/Postgres/MinIO.
* ☐ Есть loading/error/empty states.
* ☐ Pagination реализована.
* ☐ Destructive actions защищены.
* ☐ Security проверена вручную.
* ☐ Unit/component tests написаны.
* ☐ Integration tests написаны.
* ☐ E2E проходит.
* ☐ Manual QA пройден.
* ☐ Документация актуальна.

**Критическая проверка этапа:** взять обычный `USER` JWT и вручную попытаться вызвать каждый Admin endpoint. Если хотя бы один административный endpoint отдаёт защищённые данные или позволяет выполнить admin-операцию без соответствующей роли — **этап 13 не закрывается**.


--- SOURCE: pasted-text-3.txt ---

# 13.1 Admin Core (Auth, Users, Projects)

**Статус:** ⏳ TODO

## Цель этапа

Реализовать базовую административную часть приложения:

```text
Admin Login
    ↓
Admin Dashboard
    ↓
Users
    ↓
Projects
```

Администратор должен иметь отдельный интерфейс `apps/admin`, отдельную авторизацию/защиту административных маршрутов и возможность управлять пользователями и проектами.

> Важно: Admin Panel **не должна использовать frontend-проверку роли как единственный механизм безопасности**. Backend остаётся источником истины для `ADMIN`/`USER` authorization.

---

# 13.1.1 Архитектура Admin Frontend

Работа выполняется в:

```text
apps/admin/
```

Рекомендуемая структура:

```text
apps/admin/src/

├── app/
│   ├── router/
│   ├── providers/
│   └── layouts/
│
├── pages/
│   ├── auth/
│   ├── users/
│   └── projects/
│
├── features/
│   ├── auth/
│   ├── users/
│   └── projects/
│
├── components/
├── hooks/
├── services/
├── stores/
└── lib/
```

Архитектурный поток:

```text
Admin UI
   ↓
Admin Features
   ↓
SDK / API Layer
   ↓
Backend
   ↓
RBAC / Guards
   ↓
Database
```

Не размещать административную бизнес-логику непосредственно в React-компонентах.

---

# 13.1.2 Admin Layout

Создать отдельный административный layout.

```text
┌─────────────────────────────────────────┐
│ Admin Header                            │
├──────────────┬──────────────────────────┤
│ Sidebar      │                          │
│              │ Main Content             │
│ Dashboard    │                          │
│ Users        │                          │
│ Projects     │                          │
│              │                          │
│ Settings     │                          │
│              │                          │
└──────────────┴──────────────────────────┘
```

Основная навигация:

```text
Dashboard
Users
Projects
```

Остальные разделы:

```text
Queues
Logs
AI Usage
Statistics
```

будут реализованы в следующих частях этапа 13.

---

# 13.1.3 Admin Routes

Основные маршруты:

```text
/admin/login

/admin
/admin/users
/admin/users/:userId
/admin/projects
/admin/projects/:projectId
```

Для защищённых маршрутов использовать:

```text
AdminProtectedRoute
```

---

# 13.1.4 Admin Authentication

Использовать существующий Backend Auth Module.

Не создавать отдельную независимую систему пользователей.

Flow:

```text
Admin Login
     ↓
POST /auth/login
     ↓
Access Token
     ↓
GET /users/me
     ↓
Check Role
     ↓
ADMIN?
 ├── YES → Admin
 └── NO  → Access Denied
```

Конкретные endpoint'ы должны соответствовать текущему Swagger/OpenAPI контракту.

---

# 13.1.5 Admin Login

Страница:

```text
/admin/login
```

Форма:

```text
Email
Password

[ Sign in ]
```

Состояния:

```text
idle
loading
success
error
```

При неверных данных:

```text
Invalid credentials
```

При отсутствии admin role:

```text
You don't have permission to access the admin panel.
```

Не показывать технические ошибки Backend.

---

# 13.1.6 Admin Session

После успешного login:

```text
Login
 ↓
Auth State
 ↓
Current User
 ↓
Role Check
 ↓
Admin Dashboard
```

При обновлении страницы:

```text
Refresh
 ↓
Restore Session
 ↓
Validate User
 ↓
Admin
```

При истечении access token использовать существующий refresh flow.

Если refresh невозможен:

```text
Clear session
 ↓
/admin/login
```

---

# 13.1.7 Role Protection

Минимальное правило:

```text
USER
 ↓
403
```

```text
ADMIN
 ↓
Admin Panel
```

Frontend может скрывать admin UI для обычного пользователя, но реальная защита должна происходить Backend Guards.

Проверить:

```text
GET admin endpoint
       ↓
JwtAuthGuard
       ↓
RolesGuard
       ↓
ADMIN
```

---

# 13.1.8 Admin Dashboard

Создать базовый dashboard:

```text
/admin
```

Показать:

```text
Users
Projects
Active Users
Archived Projects
```

На этом этапе достаточно базовой статистики.

Расширенная статистика будет реализована позже.

---

# 13.1.9 Dashboard Cards

Минимально:

```text
┌───────────────┐
│ Users         │
│ 1,248         │
└───────────────┘

┌───────────────┐
│ Projects      │
│ 356           │
└───────────────┘

┌───────────────┐
│ Active Users  │
│ 142           │
└───────────────┘

┌───────────────┐
│ Archived      │
│ 28            │
└───────────────┘
```

Значения должны приходить API.

Не использовать hardcoded production data.

---

# 13.1.10 Users Management

Создать:

```text
/admin/users
```

Основной интерфейс — таблица пользователей.

Колонки:

```text
ID
Email
Role
Status
Created
Updated
Actions
```

---

# 13.1.11 Users List

Поддержать:

* pagination;
* search;
* role filter;
* status filter;
* sorting.

Пример:

```text
Search: [____________]

Role:
[ All ▼ ]

Status:
[ All ▼ ]

--------------------------------------------
Email          Role      Status     Actions
--------------------------------------------
admin@...      ADMIN     Active     View
user@...       USER      Active     View
user2@...      USER      Blocked    View
```

Параметры должны соответствовать Backend API.

---

# 13.1.12 User Details

Страница:

```text
/admin/users/:userId
```

Показать:

```text
User Information

Email
Role
Status
Created At
Updated At

Projects
Recent Activity
```

На этом этапе достаточно базовой информации и списка связанных проектов.

---

# 13.1.13 User Search

Реализовать server-side search.

Не загружать всех пользователей в браузер и не фильтровать тысячи записей через JavaScript.

Flow:

```text
Search

↓

GET /admin/users?search=...

↓

Backend

↓

Filtered Result
```

Добавить debounce для поля поиска.

---

# 13.1.14 User Pagination

Использовать серверную пагинацию:

```text
?page=1&limit=20
```

UI:

```text
< 1 2 3 4 5 >
```

Не загружать всю таблицу сразу.

---

# 13.1.15 User Role

Отображать:

```text
ADMIN
USER
```

Использовать `Badge`.

Например:

```text
ADMIN
USER
```

Не позволять пользователю через UI самостоятельно получить `ADMIN`.

Если изменение роли будет разрешено PRD/Backend — реализовать только через защищённый admin endpoint.

---

# 13.1.16 User Status

Отображать статус пользователя согласно фактической модели Backend.

Например:

```text
ACTIVE
BLOCKED
```

Если в текущей модели нет user status — не создавать frontend-only статус.

---

# 13.1.17 User Actions

Минимальный набор:

```text
View User
```

Дополнительные действия:

```text
Change Role
Block
Unblock
```

реализовывать **только если они уже предусмотрены Backend API / PRD**.

Не добавлять административные операции только потому, что они удобны UI.

---

# 13.1.18 Dangerous Actions

Для операций:

* block;
* delete;
* role change;

использовать confirmation modal.

Например:

```text
Block user?

user@example.com

This user will no longer be able to access
the application.

[Cancel] [Block User]
```

---

# 13.1.19 Projects Management

Создать:

```text
/admin/projects
```

Администратор должен видеть проекты пользователей.

---

# 13.1.20 Projects Table

Минимальные колонки:

```text
Project
Owner
Status
Version
Last Analysis
Created
Updated
Actions
```

Пример:

```text
------------------------------------------------------------
Project       Owner          Status      Updated
------------------------------------------------------------
Reviewsha     user@...       ACTIVE      2h ago
Backend       dev@...        ARCHIVED    1d ago
Frontend      test@...       ACTIVE      3d ago
```

---

# 13.1.21 Project Search

Поддержать:

* project name;
* owner email;
* tags, если API поддерживает.

Поиск должен выполняться Backend.

```text
GET /admin/projects?search=review
```

---

# 13.1.22 Project Filters

Добавить:

```text
Status
Owner
Date
```

Точный набор зависит от API.

Не реализовывать frontend-фильтры, которые Backend не поддерживает, если это приведёт к загрузке всех данных.

---

# 13.1.23 Project Details

Страница:

```text
/admin/projects/:projectId
```

Показать:

```text
Project

Owner

Description

Tags

Status

Created

Updated

Versions

Analyses

Reports
```

Это административный просмотр.

Не нужно дублировать весь пользовательский Project UI.

---

# 13.1.24 Project Owner

Показать владельца:

```text
Email
User ID
```

Добавить переход:

```text
View User
```

если соответствующий route существует.

---

# 13.1.25 Project Status

Показывать реальные статусы Backend.

Например:

```text
ACTIVE
ARCHIVED
```

Не создавать собственные значения.

---

# 13.1.26 Project Actions

Минимально:

```text
View
```

Дополнительные административные действия:

```text
Archive
Delete
```

реализовать только при наличии соответствующего API и требования PRD.

Для destructive operations обязательно:

```text
Confirmation
 ↓
API Request
 ↓
Success / Error
 ↓
Invalidate Cache
```

---

# 13.1.27 API Layer

Использовать:

```text
packages/sdk
packages/types
```

или текущий единый API abstraction layer.

Не делать API-вызовы непосредственно из страниц:

```tsx
fetch(...)
axios.get(...)
```

Архитектурно:

```text
Page
 ↓
Feature Hook
 ↓
SDK
 ↓
API
```

---

# 13.1.28 Server State

Для:

* users;
* projects;
* dashboard;

использовать существующий механизм server state.

Например:

```text
TanStack Query
```

Разделить:

```text
Auth State
```

и:

```text
Users / Projects / Dashboard Server State
```

---

После mutation:

```text
Update User
 ↓
Invalidate User
 ↓
Invalidate Users List
```

```text
Archive Project
 ↓
Invalidate Project
 ↓
Invalidate Projects List
```

---

# 13.1.29 Loading States

Для таблиц использовать skeleton/loading state.

Не показывать пустую таблицу во время загрузки.

Например:

```text
Loading users...

████████ ███████
████████ ███████
████████ ███████
```

---

# 13.1.30 Empty States

Если пользователей нет:

```text
No users found.
```

Если проектов нет:

```text
No projects found.
```

Если поиск ничего не дал:

```text
No results for "reviewsha".
```

---

# 13.1.31 Error States

При ошибке API:

```text
Unable to load users.

[Retry]
```

или:

```text
Unable to load project.

[Retry]
```

Не показывать:

```text
500 Internal Server Error
TypeError...
```

как основной пользовательский текст.

---

# 13.1.32 Admin Navigation

Sidebar:

```text
Dashboard
Users
Projects
```

В будущем сюда добавятся:

```text
Queues
Logs
AI Usage
Statistics
```

Не нужно заранее реализовывать их функциональность.

Можно оставить disabled/placeholder routes.

---

# 13.1.33 Admin Header

Header должен содержать:

```text
Admin Panel

Current User

Role

Logout
```

Например:

```text
Admin Panel                    admin@example.com
                               ADMIN ▼
```

---

# 13.1.34 Logout

Flow:

```text
Logout
 ↓
Backend logout
 ↓
Clear auth state
 ↓
Clear admin cache
 ↓
/admin/login
```

После logout:

* `/admin`;
* `/admin/users`;
* `/admin/projects`

должны быть недоступны.

---

# 13.1.35 Security

Особенно важно проверить:

### Frontend

* protected routes;
* role check;
* отсутствие admin UI для USER.

### Backend

* JWT;
* RolesGuard;
* ADMIN role;
* ownership/permissions;
* admin endpoints.

Frontend не должен считаться security boundary.

---

# 13.1.36 Audit Considerations

Административные действия потенциально должны попадать в Audit Log.

На этом этапе подготовить точки интеграции:

```text
Admin Action
 ↓
Backend
 ↓
Audit Log
```

Полноценная реализация Audit Log будет в `15.1` / соответствующем пункте логирования.

Не создавать отдельную frontend-систему audit logs.

---

# 13.1.37 Responsive

Admin Panel в первую очередь ориентирован на desktop.

Минимально обеспечить:

### Desktop

* sidebar;
* широкие таблицы;
* filters;
* details.

### Tablet

* collapsed sidebar;
* горизонтальный scroll таблиц.

### Mobile

* drawer;
* карточное представление или horizontal scroll;
* доступные actions.

---

# 13.1.38 Accessibility

Проверить:

* keyboard navigation;
* focus states;
* table semantics;
* labels;
* modal focus;
* accessible buttons;
* confirmation dialogs.

Особенно:

* Users table;
* Projects table;
* dropdown actions;
* destructive confirmations.

---

# 13.1.39 Tests

Тесты пишутся **в процессе разработки**, согласно сокращённому плану проекта.

## Unit / Component

Ориентир:

**40–50 тестов**

Покрыть:

* Admin Login;
* ProtectedRoute;
* Role Guard UI;
* Users Table;
* User Details;
* Projects Table;
* Project Details;
* Filters;
* Pagination;
* Modals;
* Loading/Error/Empty states.

---

# 13.1.40 Integration Tests

Ориентир:

**20–30 тестов**

Проверить:

* Admin Login API;
* current user;
* users list;
* user details;
* projects list;
* project details;
* pagination;
* search;
* filters;
* logout;
* authorization errors.

---

# 13.1.41 E2E

Минимальный набор:

**10–15 сценариев**

### Auth

* ☐ Admin login.
* ☐ Invalid login.
* ☐ USER cannot access Admin.
* ☐ Admin session survives page reload.
* ☐ Logout.

### Users

* ☐ Open users.
* ☐ Search user.
* ☐ Pagination.
* ☐ Open user details.

### Projects

* ☐ Open projects.
* ☐ Search project.
* ☐ Filter project.
* ☐ Open project details.

---

# 13.1.42 Manual QA

Проверить вручную:

### Admin

```text
Login
 ↓
Dashboard
 ↓
Users
 ↓
User Details
 ↓
Projects
 ↓
Project Details
 ↓
Logout
```

### Security

Обязательно:

```text
USER login
 ↓
/admin
 ↓
403 / redirect
```

Проверить также прямой ввод URL:

```text
/admin/users
/admin/projects
```

обычным пользователем.

---

# 13.1.43 Документация

Обновить:

```text
docs/architecture/10-frontend.md
docs/architecture/11-api-contracts.md
```

Добавить:

* Admin frontend architecture;
* Admin routes;
* Admin authentication;
* RBAC;
* Users management;
* Projects management;
* API integration.

Если административные API изменены — обновить OpenAPI/Swagger и SDK.

---

# 13.1.44 Соответствие архитектуре

Перед завершением проверить:

```text
PRD
 ↓
Architecture
 ↓
Backend Auth / Roles
 ↓
Admin API
 ↓
SDK
 ↓
Admin UI
```

Особенно:

* ☐ Admin использует существующий Auth.
* ☐ Admin использует существующий RBAC.
* ☐ Нет отдельной frontend-only системы пользователей.
* ☐ Нет обхода Backend authorization.
* ☐ Shared types используются.
* ☐ API соответствует контракту.
* ☐ Нет mock production data.
* ☐ Admin UI находится в `apps/admin`.

---

# Финальный чек-лист

## Auth

* ☐ Admin Login.
* ☐ Session restore.
* ☐ Refresh token.
* ☐ Admin role check.
* ☐ Protected routes.
* ☐ Logout.
* ☐ USER не имеет доступа.

## Dashboard

* ☐ Users count.
* ☐ Projects count.
* ☐ Active users.
* ☐ Archived projects.
* ☐ Loading.
* ☐ Error.

## Users

* ☐ List.
* ☐ Search.
* ☐ Pagination.
* ☐ Filters.
* ☐ User details.
* ☐ Role.
* ☐ Status.
* ☐ Actions согласно API.

## Projects

* ☐ List.
* ☐ Search.
* ☐ Filters.
* ☐ Pagination.
* ☐ Project details.
* ☐ Owner.
* ☐ Status.
* ☐ Versions/analyses/reports summary.
* ☐ Actions согласно API.

## Architecture

* ☐ SDK используется.
* ☐ Shared types используются.
* ☐ Server state отделён от auth state.
* ☐ Backend остаётся security boundary.
* ☐ Нет дублирования API logic.

## Quality

* ☐ Unit/component tests.
* ☐ Integration tests.
* ☐ E2E.
* ☐ Manual QA.
* ☐ Responsive QA.
* ☐ Accessibility QA.
* ☐ Документация обновлена.

---

# Критерий завершения

**13.1 считается завершённым**, когда администратор может:

```text
Login
 ↓
Admin Dashboard
 ↓
View Users
 ↓
Search / Filter / Paginate
 ↓
Open User
 ↓
View Projects
 ↓
Search / Filter / Paginate
 ↓
Open Project
 ↓
Logout
```

и при этом обычный пользователь **не может получить доступ к Admin Panel ни через UI, ни прямым запросом к защищённым Backend endpoints**.

После этого Admin Core готов, и можно переходить к следующему функционалу Admin Panel: **очереди, логи, AI Usage и статистика**.


--- SOURCE: pasted-text-4.txt ---

# 13.2 Administration (Queues, Logs, AI Usage, Statistics)

**Статус:** ⏳ TODO

## Цель этапа

Расширить Admin Panel после готового `13.1 Admin Core` административными инструментами для контроля работы системы:

```text
Admin
 │
 ├── Queues
 ├── Logs
 ├── AI Usage
 └── Statistics
```

Главный принцип:

> Admin Panel здесь — **инструмент наблюдения и управления системой**, а не место реализации бизнес-логики.

Все данные должны приходить из Backend/API. Никаких вычислений состояния очередей, AI usage или системной статистики исключительно на Frontend.

---

# 13.2.1 Архитектура

Расширить:

```text
apps/admin/
```

Пример структуры:

```text
apps/admin/src/

├── pages/
│   ├── dashboard/
│   ├── users/
│   ├── projects/
│   ├── queues/
│   ├── logs/
│   ├── ai-usage/
│   └── statistics/
│
├── features/
│   ├── queues/
│   ├── logs/
│   ├── ai-usage/
│   └── statistics/
│
├── components/
├── hooks/
├── services/
└── lib/
```

Поток данных:

```text
Admin UI
   ↓
SDK
   ↓
Admin API
   ↓
Services
   ↓
Redis / BullMQ / PostgreSQL / Logger / AI Provider
```

---

# 13.2.2 Admin Navigation

После добавления разделов Sidebar:

```text
Dashboard

Users
Projects

Queues
Logs
AI Usage
Statistics
```

Роуты:

```text
/admin/queues
/admin/logs
/admin/ai-usage
/admin/statistics
```

Все routes защищены `ADMIN`.

---

# 13.2.3 Queues

## Цель

Дать администратору возможность видеть состояние очередей обработки.

Основные очереди согласно архитектуре:

```text
Upload
Extract
Parse
Analyze
Merge
Generate Report
Notify
```

Фактический список должен соответствовать реализованному `BullMQ` pipeline.

---

# 13.2.4 Queue Overview

Страница:

```text
/admin/queues
```

Показать карточки:

```text
┌──────────────────┐
│ Analyze          │
│                  │
│ Waiting: 12      │
│ Active: 3        │
│ Failed: 2        │
│ Completed: 145   │
└──────────────────┘
```

Для каждой очереди:

* name;
* waiting;
* active;
* completed;
* failed;
* delayed, если используется.

---

# 13.2.5 Queue Status

Добавить общий статус:

```text
HEALTHY
DEGRADED
ERROR
```

Например:

```text
Analyze
● Healthy
```

или:

```text
Analyze
● Degraded
```

Статус должен рассчитываться Backend на основе реального состояния очереди.

---

# 13.2.6 Queue Details

Страница:

```text
/admin/queues/:queueName
```

Показать:

```text
Queue

Waiting
Active
Completed
Failed
Delayed
```

Ниже:

```text
Jobs
```

---

# 13.2.7 Jobs Table

Колонки:

```text
Job ID
Type
Status
Created
Started
Finished
Attempts
Duration
```

Например:

```text
------------------------------------------------------------
Job ID       Status       Attempts      Duration
------------------------------------------------------------
abc123       completed       1          12s
abc124       failed          3          48s
abc125       active          1          --
```

---

# 13.2.8 Job Details

При открытии:

```text
/admin/queues/:queueName/jobs/:jobId
```

Показать:

* job ID;
* queue;
* status;
* timestamps;
* attempts;
* error;
* duration;
* metadata;
* related project;
* related analysis.

Не отображать секреты или sensitive payload.

---

# 13.2.9 Failed Jobs

Отдельный фильтр:

```text
Failed
```

Показывать:

* job;
* error;
* attempts;
* failed at;
* queue.

Администратор должен быстро понимать:

```text
что упало
почему
когда
сколько раз
```

---

# 13.2.10 Retry Job

Если архитектура и Backend API позволяют:

```text
[ Retry ]
```

Flow:

```text
Admin
 ↓
Retry
 ↓
POST /admin/queues/:queue/jobs/:id/retry
 ↓
BullMQ
 ↓
Job returns to queue
```

После retry:

```text
Invalidate queue
Invalidate job
```

Не реализовывать retry через прямой доступ Admin Frontend к Redis.

---

# 13.2.11 Remove Failed Job

Если предусмотрено Backend API:

```text
[ Remove ]
```

Обязательно confirmation:

```text
Remove failed job?

This action cannot be undone.

[Cancel] [Remove]
```

---

# 13.2.12 Queue Auto Refresh

Для monitoring UI использовать polling или другой предусмотренный механизм.

Например:

```text
Every 5–10 seconds
```

Обновлять:

* queue counts;
* active jobs;
* failed jobs.

Не делать бесконечный aggressive polling.

---

# 13.2.13 Logs

## Цель

Дать администратору централизованный просмотр системных логов.

Страница:

```text
/admin/logs
```

---

# 13.2.14 Logs Table

Колонки:

```text
Timestamp
Level
Service
Message
Request ID
```

Например:

```text
---------------------------------------------------------------
Time        Level   Service    Message
---------------------------------------------------------------
12:41:03    INFO    API        Request completed
12:41:04    WARN    Worker     Job retry
12:41:05    ERROR   AI         Provider timeout
```

---

# 13.2.15 Log Levels

Поддержать:

```text
DEBUG
INFO
WARN
ERROR
FATAL
```

Фактический список должен соответствовать Logger implementation.

---

# 13.2.16 Log Filters

Добавить:

* level;
* service;
* date/time;
* request ID;
* search.

Например:

```text
Level: [ERROR]
Service: [worker]
From: [date]
To: [date]

Search: [timeout]
```

Фильтрация должна выполняться Backend.

---

# 13.2.17 Log Details

При открытии записи:

```text
Timestamp
Level
Service
Message
Request ID
Trace ID
Metadata
Stack Trace
```

если эти поля существуют.

---

# 13.2.18 Stack Trace

Для `ERROR` / `FATAL` показывать stack trace в отдельном code block.

Например:

```text
Error
--------------------------------
AI provider timeout

Stack trace:
...
```

Добавить возможность копирования.

---

# 13.2.19 Sensitive Data

Frontend/Admin API не должны показывать:

* access tokens;
* refresh tokens;
* passwords;
* API keys;
* provider secrets;
* credentials;
* приватные payloads без необходимости.

Даже если они случайно присутствуют в raw logs, Backend должен их маскировать.

---

# 13.2.20 AI Usage

## Цель

Показать использование AI системы.

Страница:

```text
/admin/ai-usage
```

Основные показатели:

```text
Requests
Tokens
Cost
Failures
Latency
```

---

# 13.2.21 AI Usage Overview

Карточки:

```text
AI Requests
12,420

Input Tokens
2.4M

Output Tokens
0.8M

Estimated Cost
$XX.XX

Errors
142
```

Значения приходят Backend.

---

# 13.2.22 AI Provider Breakdown

Если используется:

```text
OmniRouter
DeepSeek
```

показать распределение:

```text
Provider       Requests     Tokens
------------------------------------
DeepSeek       8,420        1.8M
Other           4,000        1.4M
```

Фактический список providers берётся из конфигурации/usage data.

---

# 13.2.23 AI Usage Filters

Фильтры:

```text
Date Range
Provider
Model
User
Project
```

если Backend поддерживает соответствующие параметры.

---

# 13.2.24 AI Usage Per User

Таблица:

```text
User
Requests
Input Tokens
Output Tokens
Cost
```

Например:

```text
user@example.com
124 requests
42K tokens
$0.82
```

---

# 13.2.25 AI Usage Per Project

Таблица:

```text
Project
Requests
Tokens
Cost
```

Это позволяет определить проекты с высоким AI consumption.

---

# 13.2.26 AI Failures

Отдельно отображать:

```text
AI Errors
```

Показать:

* provider;
* model;
* error;
* timestamp;
* latency;
* retry count.

Не показывать API credentials.

---

# 13.2.27 Statistics

## Цель

Создать системный overview.

Страница:

```text
/admin/statistics
```

---

# 13.2.28 User Statistics

Показатели:

```text
Total Users
New Users
Active Users
```

За выбранный период.

Например:

```text
Today
7 days
30 days
Custom
```

---

# 13.2.29 Project Statistics

Показать:

```text
Total Projects
New Projects
Archived Projects
Active Projects
```

---

# 13.2.30 Analysis Statistics

Показать:

```text
Total Analyses
Completed
Failed
Running
```

Дополнительно:

```text
Success Rate
Average Duration
```

---

# 13.2.31 Processing Statistics

Показать показатели pipeline:

```text
Upload
Extract
Parse
Analyze
Merge
Report
```

Например:

```text
Analyze

Completed: 1,240
Failed: 31
Average: 48s
```

---

# 13.2.32 Charts

Добавить визуализации только для данных, где они действительно полезны.

Например:

### Analyses over time

```text
Analyses
│
│       ╭─╮
│    ╭──╯ ╰─╮
│ ╭──╯      ╰──
└────────────────
```

### AI Usage

```text
Tokens / Day
```

### Errors

```text
Errors / Day
```

Не перегружать dashboard графиками.

---

# 13.2.33 Date Range

Единый компонент:

```text
DateRangePicker
```

Варианты:

```text
Today
7 days
30 days
90 days
Custom
```

Использовать единый формат дат и timezone согласно Backend policy.

---

# 13.2.34 Data Refresh

Для статистики не нужен такой же частый refresh, как для queues.

Например:

```text
Queues       → 5–10 sec
Logs         → manual / 10–30 sec
AI Usage     → manual / 30–60 sec
Statistics   → manual / several minutes
```

Конкретные интервалы можно вынести в конфигурацию.

---

# 13.2.35 API Layer

Добавить административные API в SDK:

```text
AdminQueuesApi
AdminLogsApi
AdminAiUsageApi
AdminStatisticsApi
```

или использовать структуру, принятую текущим SDK.

Принцип:

```text
Admin Page
 ↓
Feature Hook
 ↓
SDK
 ↓
Backend
```

Не:

```text
Admin Page
 ↓
fetch()
 ↓
Redis
```

---

# 13.2.36 Backend Endpoints

Перед реализацией Frontend проверить наличие соответствующих Backend endpoints.

Минимально должны существовать API для:

```text
Queues
GET queues
GET queue
GET jobs
GET job
POST retry
DELETE/remove
```

```text
Logs
GET logs
GET log
```

```text
AI Usage
GET summary
GET by user
GET by project
GET by provider
```

```text
Statistics
GET overview
GET users
GET projects
GET analyses
GET processing
```

**Не создавать API-контракт только на стороне Frontend.**

Если endpoint отсутствует:

1. определить его в Backend;
2. обновить OpenAPI;
3. обновить SDK;
4. после этого подключить Admin UI.

---

# 13.2.37 Permissions

Все endpoints должны быть защищены:

```text
JwtAuthGuard
+
RolesGuard
+
ADMIN
```

Для особо опасных действий:

```text
Admin
+
explicit permission/action
```

если такая модель предусмотрена архитектурой.

---

# 13.2.38 Loading / Empty / Error

Каждый раздел обязан иметь:

```text
Loading
Empty
Error
Success
```

### Queues

```text
No queues available
```

### Logs

```text
No logs found
```

### AI Usage

```text
No AI usage for selected period
```

### Statistics

```text
No statistics available
```

---

# 13.2.39 Responsive

Основной target:

**Desktop Admin Panel.**

Но:

* tablet должен работать;
* mobile должен позволять хотя бы просматривать данные;
* таблицы должны иметь адаптивное представление или horizontal scroll.

---

# 13.2.40 Accessibility

Проверить:

* keyboard navigation;
* focus;
* table semantics;
* filters;
* dialogs;
* charts имеют текстовое представление данных;
* status indicators не зависят только от цвета.

---

# 13.2.41 Tests

Тесты писать вместе с реализацией.

## Unit / Component

Ориентир:

**50–60 тестов**

Распределение:

| Module     | Tests |
| ---------- | ----: |
| Queues     |   15+ |
| Logs       |   10+ |
| AI Usage   |   15+ |
| Statistics |   15+ |

Покрыть:

* rendering;
* filters;
* pagination;
* refresh;
* states;
* actions;
* permission handling.

---

# 13.2.42 Integration Tests

Ориентир:

**30+ тестов**

Проверить:

### Queues

* list;
* details;
* jobs;
* retry;
* remove;
* errors.

### Logs

* filtering;
* search;
* details;
* date range.

### AI

* summary;
* provider;
* user;
* project;
* errors.

### Statistics

* overview;
* date ranges;
* metrics.

---

# 13.2.43 E2E

Ориентир:

**15–20 сценариев**

### Queues

* ☐ Open queues.
* ☐ Open queue details.
* ☐ Open job.
* ☐ Filter failed jobs.
* ☐ Retry job.

### Logs

* ☐ Open logs.
* ☐ Filter ERROR.
* ☐ Search logs.
* ☐ Open log details.

### AI Usage

* ☐ Open usage.
* ☐ Change date range.
* ☐ Filter provider.
* ☐ View user usage.
* ☐ View project usage.

### Statistics

* ☐ Open statistics.
* ☐ Change period.
* ☐ View user statistics.
* ☐ View project statistics.
* ☐ View analysis statistics.

---

# 13.2.44 Manual QA

Проверить полный flow:

```text
Admin Login
 ↓
Queues
 ↓
Queue Details
 ↓
Failed Job
 ↓
Retry
 ↓
Logs
 ↓
Find Related Error
 ↓
AI Usage
 ↓
Statistics
```

Отдельно проверить:

* данные обновляются;
* фильтры корректны;
* pagination работает;
* retry действительно меняет состояние job;
* ошибки отображаются понятно;
* sensitive data отсутствует.

---

# 13.2.45 Performance

Особое внимание:

### Logs

Не загружать тысячи/миллионы записей.

Обязательно:

* pagination;
* server-side filtering;
* server-side search.

### Jobs

Не загружать всю историю BullMQ.

Использовать pagination.

### Statistics

Агрегация должна выполняться Backend/DB, а не браузером.

---

# 13.2.46 Security QA

Проверить прямые запросы:

```text
USER
 ↓
GET /admin/queues
```

Ожидается:

```text
403
```

Аналогично:

```text
/admin/logs
/admin/ai-usage
/admin/statistics
```

Для mutation:

```text
POST retry
DELETE job
```

также проверять authorization.

---

# 13.2.47 Документация

Обновить:

```text
docs/architecture/10-frontend.md
docs/architecture/11-api-contracts.md
```

Зафиксировать:

* Admin routes;
* Queue monitoring;
* Logs;
* AI usage;
* Statistics;
* refresh strategy;
* permissions;
* API contracts.

Если появились новые API — они должны быть отражены в Swagger/OpenAPI.

---

# 13.2.48 Финальный чек-лист

## Queues

* ☐ Queue overview.
* ☐ Queue details.
* ☐ Job list.
* ☐ Job details.
* ☐ Statuses.
* ☐ Failed jobs.
* ☐ Retry.
* ☐ Remove.
* ☐ Auto refresh.
* ☐ Pagination.
* ☐ Error states.

## Logs

* ☐ Logs list.
* ☐ Levels.
* ☐ Service filter.
* ☐ Date filter.
* ☐ Search.
* ☐ Request ID.
* ☐ Log details.
* ☐ Stack trace.
* ☐ Sensitive data masking.

## AI Usage

* ☐ Summary.
* ☐ Requests.
* ☐ Tokens.
* ☐ Cost.
* ☐ Provider.
* ☐ Model.
* ☐ User.
* ☐ Project.
* ☐ Errors.
* ☐ Date filters.

## Statistics

* ☐ User statistics.
* ☐ Project statistics.
* ☐ Analysis statistics.
* ☐ Processing statistics.
* ☐ Charts.
* ☐ Date ranges.
* ☐ Refresh.

## Security

* ☐ All routes protected.
* ☐ All API endpoints protected.
* ☐ USER → 403.
* ☐ Admin mutations protected.
* ☐ No secrets exposed.

## Architecture

* ☐ SDK used.
* ☐ Shared types used.
* ☐ Backend owns aggregation.
* ☐ Backend owns authorization.
* ☐ No direct Redis access from frontend.
* ☐ No direct database access.
* ☐ No mock production data.

## Quality

* ☐ Unit/component tests.
* ☐ Integration tests.
* ☐ E2E.
* ☐ Manual QA.
* ☐ Performance checked.
* ☐ Responsive checked.
* ☐ Accessibility checked.
* ☐ Documentation updated.

---

# Критерий завершения

`13.2` считается завершённым, когда администратор получает полноценный operational overview системы:

```text
                    ADMIN
                      │
       ┌──────────────┼──────────────┐
       ↓              ↓              ↓
    Queues          Logs         AI Usage
       │              │              │
       └──────────────┼──────────────┘
                      ↓
                 Statistics
```

и может:

* видеть состояние всех очередей;
* находить и анализировать failed jobs;
* выполнять разрешённые retry/remove операции;
* искать системные ошибки в логах;
* анализировать AI usage;
* видеть usage по пользователям и проектам;
* смотреть общую статистику системы.

При этом **ни Redis, ни PostgreSQL, ни AI providers не доступны напрямую из Admin Frontend** — всё проходит через защищённый Backend API.

После `13.2` весь основной функционал **Admin Panel** из текущего плана будет реализован.


--- SOURCE: pasted-text-10.txt ---

# Этап 14 — SDK: чек-лист сверки

Цель этапа — убедиться, что между Backend, OpenAPI и frontend/admin существует **единый типизированный API-контракт**, а SDK реально используется приложениями.

Архитектура:

```text
Backend Controllers
       ↓
    OpenAPI
       ↓
Generated SDK
       ↓
 ┌─────┴─────┐
 ↓           ↓
Web         Admin
```

---

# 14.1 OpenAPI & SDK

## OpenAPI

* ☐ OpenAPI включён в `apps/api`.
* ☐ Swagger UI доступен.
* ☐ OpenAPI JSON доступен.
* ☐ Все MVP endpoints документированы.
* ☐ Все request DTO документированы.
* ☐ Все response DTO документированы.
* ☐ Query parameters описаны.
* ☐ Path parameters описаны.
* ☐ Request body описан.
* ☐ Error responses описаны.
* ☐ HTTP status codes корректны.
* ☐ Authentication schemes описаны.
* ☐ Bearer JWT описан.
* ☐ Pagination описана.
* ☐ Upload/multipart описан.
* ☐ Streaming contract описан, если он есть.
* ☐ Enum значения присутствуют.
* ☐ Nullable/optional поля корректны.

---

# OpenAPI ↔ Backend

Главная проверка:

> OpenAPI должен отражать **реальное поведение Backend**, а не быть отдельно написанной документацией.

Для каждого endpoint:

```text
Controller
   ↓
DTO
   ↓
Swagger metadata
   ↓
OpenAPI
```

Проверить:

* ☐ endpoint существует;
* ☐ method правильный;
* ☐ path правильный;
* ☐ request правильный;
* ☐ response правильный;
* ☐ auth правильный;
* ☐ status codes правильные;
* ☐ ошибки правильные.

---

# SDK Generation

* ☐ SDK генерируется автоматически из OpenAPI.
* ☐ Генератор определён в проекте.
* ☐ Версия генератора зафиксирована.
* ☐ Команда генерации работает.
* ☐ SDK находится в `packages/sdk`.
* ☐ SDK не редактируется вручную после генерации.
* ☐ Regenerate не ломает repository.
* ☐ Generated types соответствуют Backend.

Например:

```text
OpenAPI
   ↓
generate
   ↓
packages/sdk
```

---

# SDK Structure

Проверить наличие логических API групп:

```text
packages/sdk/
├── generated/
├── client/
└── index.ts
```

Фактическая структура может отличаться.

Важно:

* ☐ generated code отделён от custom wrapper code;
* ☐ custom code не изменяет generated files;
* ☐ public exports централизованы;
* ☐ consumers импортируют SDK через package entrypoint.

---

# SDK API

Проверить основные группы:

* ☐ Auth.
* ☐ Users.
* ☐ Projects.
* ☐ Upload.
* ☐ Analysis.
* ☐ Reports.
* ☐ Chat.
* ☐ Admin.
* ☐ Queues.
* ☐ Logs.
* ☐ AI Usage.
* ☐ Statistics.

Все группы должны соответствовать реальному API.

---

# Type Safety

Проверить:

* ☐ Request types генерируются.
* ☐ Response types генерируются.
* ☐ Enum types генерируются.
* ☐ Pagination types типизированы.
* ☐ Error types типизированы настолько, насколько позволяет contract.
* ☐ Нет ручного дублирования DTO во frontend.
* ☐ Нет `any` для обычных API responses.
* ☐ Nullable поля правильно отражены.

Особенно проверить:

```text
Backend DTO
      ↓
OpenAPI schema
      ↓
Generated Type
      ↓
Frontend
```

Тип не должен "ломаться" на каком-либо этапе.

---

# Authentication

SDK должен поддерживать архитектурный auth flow:

```text
Request
 ↓
Access Token
 ↓
401
 ↓
Refresh
 ↓
New Token
 ↓
Retry
```

Проверить:

* ☐ Authorization header.
* ☐ Token injection.
* ☐ Refresh.
* ☐ Concurrent refresh protection.
* ☐ Logout.
* ☐ Session expiration.
* ☐ Retry original request.
* ☐ Infinite refresh loop невозможен.

---

# API Errors

Проверить обработку:

```text
400
401
403
404
409
422
429
500
503
```

если эти статусы используются Backend.

SDK должен позволять приложению понять:

```text
status
code
message
details
```

если они предусмотрены error contract.

---

# Upload

Особенно тщательно проверить upload.

* ☐ Multipart request.
* ☐ File type.
* ☐ File size.
* ☐ Upload endpoint.
* ☐ Version information.
* ☐ Error response.
* ☐ Progress, если SDK/transport поддерживает.
* ☐ Cancellation, если предусмотрена.

---

# Streaming

Проверить отдельно, потому что обычный generated SDK может быть недостаточен.

```text
Chat
 ↓
Streaming endpoint
 ↓
SSE/stream
 ↓
Frontend
```

* ☐ Streaming contract документирован.
* ☐ SDK предоставляет подходящий abstraction либо отдельный transport layer.
* ☐ Не приходится писать одинаковый streaming client в Web и Admin.
* ☐ Disconnect обрабатывается.
* ☐ Errors обрабатываются.
* ☐ Final event корректно определяется.

---

# 14.2 Frontend Integration

## Web

Проверить, что `apps/web` использует SDK для:

* ☐ Auth.
* ☐ User.
* ☐ Projects.
* ☐ Upload.
* ☐ Analysis.
* ☐ Reports.
* ☐ Chat.
* ☐ Settings.

---

## Admin

Проверить:

* ☐ Auth.
* ☐ Users.
* ☐ Projects.
* ☐ Queues.
* ☐ Logs.
* ☐ AI Usage.
* ☐ Statistics.

---

# API Client

Не должно быть ситуации:

```text
Web
 ├── axios client
 ├── fetch client
 └── SDK

Admin
 ├── fetch client
 └── SDK
```

Должно быть примерно:

```text
             SDK
           /     \
        Web      Admin
```

Проверить:

* ☐ Один подход к API.
* ☐ Общая auth integration.
* ☐ Общая error strategy.
* ☐ Общий base URL configuration.
* ☐ Нет дублирования API client.

---

# Legacy API Code

Выполнить поиск:

```bash
grep -R "fetch(" apps/web apps/admin
grep -R "axios" apps/web apps/admin
```

Каждое найденное использование проверить вручную.

Разрешено оставить отдельный transport, если это действительно необходимо для:

* streaming;
* upload progress;
* browser-specific functionality.

Но должно быть понятно **почему**.

---

# DTO Duplication

Поискать:

```text
LoginRequest
LoginResponse
ProjectDto
UserDto
ReportDto
ChatMessageDto
```

во frontend.

Если такие типы уже существуют в SDK:

* ☐ удалить дубликаты;
* ☐ заменить импортом из SDK;
* ☐ проверить несовместимые локальные модели.

---

# Versioning

Проверить:

* ☐ `packages/sdk/package.json` имеет версию.
* ☐ Generated SDK reproducible.
* ☐ Изменение OpenAPI приводит к изменению SDK.
* ☐ Breaking changes отслеживаются.
* ☐ Нет ручного рассинхрона между Backend и SDK.

---

# Reproducibility

Критическая проверка:

Удалить generated SDK:

```text
packages/sdk/generated
```

и выполнить:

```bash
yarn sdk:generate
```

После генерации:

* ☐ проект снова собирается;
* ☐ typecheck проходит;
* ☐ Web собирается;
* ☐ Admin собирается;
* ☐ API contract не потерян.

То есть SDK должен быть **воспроизводимым артефактом**, а не ручным кодом.

---

# CI / Checks

Хотя CI у тебя уже на GitHub, pipeline должен проверять хотя бы:

```text
OpenAPI generation
        ↓
SDK generation
        ↓
typecheck
        ↓
build
```

Минимально:

```bash
yarn typecheck
yarn build
```

И отдельная проверка, что generated SDK не расходится с OpenAPI.

---

# Tests

Так как тесты пишутся в процессе разработки, к закрытию 14-го этапа должны быть покрыты критические SDK сценарии.

## SDK tests

Ориентир:

**20–30 тестов**

Проверить:

* ☐ Client initialization.
* ☐ Base URL.
* ☐ Auth header.
* ☐ 401.
* ☐ Refresh.
* ☐ Concurrent refresh.
* ☐ Retry.
* ☐ Logout.
* ☐ 403.
* ☐ 404.
* ☐ Validation errors.
* ☐ Pagination.
* ☐ Upload.
* ☐ Streaming.

---

## Integration tests

Ориентир:

**15–25 тестов**

Проверить реальную связку:

```text
Backend
 ↓
OpenAPI
 ↓
SDK
 ↓
Consumer
```

Минимум:

* ☐ Auth.
* ☐ Projects.
* ☐ Upload.
* ☐ Reports.
* ☐ Chat.
* ☐ Admin API.

---

# E2E / Contract Verification

Минимум **5–8 критических сценариев**:

### Auth

```text
Login
 ↓
SDK
 ↓
Backend
 ↓
User
```

### Projects

```text
Create Project
 ↓
SDK
 ↓
Backend
 ↓
Response
```

### Upload

```text
Upload ZIP
 ↓
SDK
 ↓
Backend
```

### Reports

```text
Get Report
 ↓
Download
```

### Chat

```text
Send message
 ↓
Streaming
```

### Admin

```text
Admin
 ↓
Users / Queues / Statistics
```

---

# Manual QA

Проверить руками:

* ☐ Swagger UI открывается.
* ☐ OpenAPI JSON скачивается/открывается.
* ☐ SDK regeneration работает.
* ☐ Web запускается после regeneration.
* ☐ Admin запускается после regeneration.
* ☐ Login работает.
* ☐ Project CRUD работает.
* ☐ Upload работает.
* ☐ Report download работает.
* ☐ Chat streaming работает.
* ☐ Admin API работает.
* ☐ Ошибки отображаются корректно.

---

# Contract Drift

Обязательно провести специальную проверку:

```text
Backend
  ≠
OpenAPI
  ≠
SDK
```

не должно существовать.

Проверить несколько endpoint вручную:

```text
Backend DTO
        ↓
Swagger schema
        ↓
Generated SDK type
        ↓
Frontend usage
```

Особенно:

* Projects.
* Reports.
* Chat.
* Upload.
* Admin Users.

---

# Documentation

Проверить:

```text
docs/architecture/11-api-contracts.md
```

Документ должен описывать:

* ☐ API contract.
* ☐ OpenAPI.
* ☐ SDK generation.
* ☐ Authentication.
* ☐ Errors.
* ☐ Pagination.
* ☐ Upload.
* ☐ Streaming.
* ☐ Versioning.

Также README должен содержать:

* ☐ как сгенерировать SDK;
* ☐ как запустить проект;
* ☐ где находится SDK;
* ☐ как обновить SDK после изменения API.

---

# Code Quality

* ☐ Generated code не редактируется вручную.
* ☐ Custom SDK wrappers отделены.
* ☐ Нет дублирования DTO.
* ☐ Нет дублирования API clients.
* ☐ Нет необоснованных `any`.
* ☐ Нет hardcoded API URL.
* ☐ Нет debug logs.
* ☐ Нет устаревшего API-кода.
* ☐ Public SDK exports понятны.
* ☐ Naming соответствует проекту.

---

# Финальная проверка структуры

Должно получиться:

```text
apps/
├── api
│   └── OpenAPI
│
├── web
│   └── @reviewsha/sdk
│
└── admin
    └── @reviewsha/sdk

packages/
└── sdk
    ├── generated
    ├── client
    └── index
```

---

# Критерии закрытия Этапа 14

Этап **14 — COMPLETE**, если:

### OpenAPI

* ☐ API полностью описан.
* ☐ Swagger актуален.
* ☐ OpenAPI JSON актуален.
* ☐ Auth описан.
* ☐ Errors описаны.
* ☐ Upload описан.
* ☐ Streaming описан.

### SDK

* ☐ SDK генерируется из OpenAPI.
* ☐ Генерация воспроизводима.
* ☐ Типы соответствуют Backend.
* ☐ Auth работает.
* ☐ Errors работают.
* ☐ Upload работает.
* ☐ Streaming поддержан.
* ☐ Нет ручного изменения generated code.

### Frontend

* ☐ Web использует SDK.
* ☐ Admin использует SDK.
* ☐ Нет дублирующих DTO.
* ☐ Нет дублирующих API clients.
* ☐ API URL конфигурируется через environment.
* ☐ Auth централизован.
* ☐ Error handling централизован.

### Проверки

* ☐ SDK regeneration.
* ☐ Typecheck.
* ☐ Build.
* ☐ SDK tests.
* ☐ Integration tests.
* ☐ Contract verification.
* ☐ E2E критических API flows.
* ☐ Manual QA.

### Документация

* ☐ API documentation актуальна.
* ☐ SDK generation описан.
* ☐ Frontend integration описан.
* ☐ README обновлён.

---

## Главный критерий

Самая важная проверка этапа:

```text
┌──────────────┐
│   Backend    │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   OpenAPI    │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│     SDK      │
└──────┬───────┘
       │
   ┌───┴───┐
   ↓       ↓
 Web     Admin
```

**Один источник API-контракта → один SDK → два потребителя.**

Если Backend изменили, OpenAPI → SDK можно пересобрать, и **Web/Admin автоматически получают актуальные типы и методы**. Если этот цикл работает без ручного переписывания API-кода — `14` можно закрывать.


--- SOURCE: pasted-text-5.txt ---

# 14.1 OpenAPI & SDK

**Статус:** ⏳ TODO

## Цель этапа

Сделать OpenAPI единственным формальным контрактом между Backend и клиентами:

```text
                 Backend
                    │
                    ↓
              OpenAPI Schema
                    │
          ┌─────────┴─────────┐
          ↓                   ↓
      Web SDK              Admin SDK
          ↓                   ↓
       apps/web          apps/admin
```

При этом `packages/sdk` должен стать единой точкой взаимодействия frontend-приложений с API.

Главная задача `14.1` — **не просто получить Swagger JSON**, а привести API contract в состояние, при котором SDK можно безопасно использовать во всём monorepo.

---

# 14.1.1 Source of Truth

Зафиксировать правило:

```text
NestJS Controllers
        ↓
Swagger decorators
        ↓
OpenAPI
        ↓
Generated SDK
        ↓
Web / Admin
```

Не должно быть:

```text
Backend DTO ≠ OpenAPI DTO ≠ Frontend Type
```

То есть нельзя вручную поддерживать несколько независимых моделей.

---

# 14.1.2 Проверка текущего OpenAPI

Использовать уже существующий:

```text
/api/docs
/api/docs-json
```

Проверить, что OpenAPI содержит все реализованные модули:

```text
Auth
Users
Projects
Upload
Analysis
Reports
Chat
Admin
```

Фактический список должен соответствовать текущему проекту.

---

# 14.1.3 OpenAPI Metadata

Настроить:

```text
title
description
version
servers
tags
security schemes
```

Например:

```text
Reviewsha API
Version: 1.0.0
```

Swagger должен быть понятен человеку без просмотра исходного кода.

---

# 14.1.4 API Tags

Разделить endpoints по доменам:

```text
Auth
Users
Projects
Files
Analysis
Reports
Chat
Admin
```

Например:

```text
GET /projects
POST /projects
GET /projects/{id}
PATCH /projects/{id}
```

должны находиться в `Projects`.

---

# 14.1.5 DTO Documentation

Каждый публичный DTO должен иметь OpenAPI metadata.

Проверить:

* description;
* required/optional fields;
* types;
* enums;
* nullable;
* formats;
* examples.

Например:

```text
CreateProjectDto

name
description
tags
```

Swagger должен явно показывать обязательные поля.

---

# 14.1.6 Response Schemas

Не оставлять endpoints с неописанным:

```text
200
201
400
401
403
404
409
422
500
```

если эти ответы реально возможны.

Для основных endpoints определить response schema.

Например:

```text
POST /projects

201 → ProjectResponse
400 → ValidationError
401 → Unauthorized
```

---

# 14.1.7 Error Contract

Зафиксировать единый API error format.

Например:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Invalid request",
  "requestId": "..."
}
```

Конкретная структура должна соответствовать уже принятому Backend error contract.

Важно, чтобы frontend не зависел от произвольных строк ошибок.

---

# 14.1.8 Authentication Scheme

В OpenAPI описать существующую authentication scheme.

Например:

```text
bearerAuth
```

Endpoints должны явно отражать необходимость авторизации.

Публичные endpoints:

```text
POST /auth/login
POST /auth/refresh
```

Защищённые:

```text
GET /users/me
GET /projects
...
```

Admin endpoints дополнительно документировать с учётом роли.

---

# 14.1.9 Security Documentation

Проверить:

```text
401
```

для отсутствующей/невалидной авторизации.

И:

```text
403
```

для недостаточных permissions.

Особенно для:

```text
/admin/*
```

---

# 14.1.10 OpenAPI Validation

OpenAPI schema должна валидироваться автоматически.

Проверять:

* корректность JSON;
* отсутствие broken `$ref`;
* валидность schemas;
* валидность paths;
* security definitions.

Пайплайн:

```text
Build API
   ↓
Generate OpenAPI
   ↓
Validate OpenAPI
   ↓
Generate SDK
```

Если schema невалидна — build должен падать.

---

# 14.1.11 SDK Package

Основная реализация:

```text
packages/sdk/
```

Пример:

```text
packages/sdk/
├── src/
│   ├── client/
│   ├── generated/
│   ├── auth/
│   ├── errors/
│   └── index.ts
├── package.json
└── tsconfig.json
```

Точная структура зависит от выбранного generator.

---

# 14.1.12 SDK Generation

Выбрать **один** OpenAPI generator и закрепить его в проекте.

Например:

```text
OpenAPI
   ↓
openapi-typescript-codegen
```

или другой актуальный generator.

Не смешивать несколько генераторов.

Главное требование:

> SDK должен генерироваться повторяемо одной командой.

Например:

```bash
yarn sdk:generate
```

---

# 14.1.13 Generated vs Manual Code

Чётко разделить:

```text
generated/
```

и:

```text
custom/
```

Generated code не редактировать вручную.

Например:

```text
packages/sdk/src/
├── generated/
│   ├── models/
│   └── services/
│
└── custom/
    ├── client.ts
    ├── auth.ts
    └── errors.ts
```

Если generator позволяет полностью закрыть нужды проекта без custom wrapper — это предпочтительнее.

---

# 14.1.14 SDK Client

Создать API client:

```ts
const client = createApiClient({
  baseUrl,
});
```

Он должен поддерживать:

* base URL;
* headers;
* authorization;
* credentials;
* timeout;
* error handling.

---

# 14.1.15 Authentication Integration

SDK должен уметь работать с существующей auth-системой.

Поток:

```text
SDK Request
    ↓
Access Token
    ↓
Authorization: Bearer ...
    ↓
Backend
```

Для refresh:

```text
401
 ↓
Refresh Token
 ↓
New Access Token
 ↓
Retry Request
```

Но refresh logic не должна хаотично дублироваться в каждом feature.

---

# 14.1.16 Web Integration

`apps/web` переводится на SDK.

Вместо:

```ts
fetch('/api/projects')
```

использовать SDK abstraction.

Например:

```text
Projects Feature
      ↓
SDK
      ↓
GET /projects
```

Проверить все уже реализованные features:

* Auth;
* Dashboard;
* Projects;
* Upload;
* Analysis;
* Reports;
* Chat;
* Settings.

---

# 14.1.17 Admin Integration

`apps/admin` также переводится на SDK.

Проверить:

```text
Auth
Users
Projects
Queues
Logs
AI Usage
Statistics
```

Не должно существовать отдельной копии API client для Admin.

---

# 14.1.18 Shared Types

`packages/types` не должен конфликтовать с generated OpenAPI models.

Нужно определить ответственность.

Например:

```text
packages/types
    ↓
Domain / shared frontend types

packages/sdk/generated
    ↓
API request / response contracts
```

Если тип является исключительно API contract — предпочтительно использовать generated type.

Не делать:

```text
UserApiResponse
UserDto
UserModel
UserResponse
UserType
```

без необходимости.

---

# 14.1.19 DTO Naming

Привести названия к единому стилю.

Например:

```text
CreateProjectRequest
UpdateProjectRequest
ProjectResponse
ProjectListResponse
```

или другой единый convention.

Главное — одинаковая схема во всём API.

---

# 14.1.20 Pagination Contract

Унифицировать pagination.

Например:

```text
?page=1&limit=20
```

Ответ:

```json
{
  "items": [],
  "page": 1,
  "limit": 20,
  "total": 100,
  "totalPages": 5
}
```

Конкретная структура должна соответствовать архитектуре проекта.

Одинаковый подход использовать для:

* users;
* projects;
* reports;
* messages;
* jobs;
* logs.

если это применимо.

---

# 14.1.21 Filtering Contract

Документировать стандартные query parameters:

```text
search
page
limit
sort
order
status
from
to
```

Не использовать разные названия для одного назначения.

Например, не:

```text
?pageNumber=1
```

в одном endpoint и:

```text
?page=1
```

в другом без необходимости.

---

# 14.1.22 Date / Time Contract

Зафиксировать формат:

```text
ISO 8601
```

Например:

```text
2026-08-08T12:00:00Z
```

SDK должен получать корректный тип/формат.

Не передавать даты в произвольных строковых форматах.

---

# 14.1.23 Enum Contract

Все enum должны быть явно описаны OpenAPI.

Например:

```text
ProjectStatus
ACTIVE
ARCHIVED
```

```text
JobStatus
WAITING
ACTIVE
COMPLETED
FAILED
```

Frontend не должен вручную угадывать возможные значения.

---

# 14.1.24 File Upload Contract

Особое внимание Upload API.

OpenAPI должен корректно описывать:

```text
multipart/form-data
```

и:

```text
file
```

а также:

* максимальный размер;
* допустимый content type;
* response;
* ошибки validation.

SDK должен корректно уметь передавать ZIP.

---

# 14.1.25 Streaming Contract

Для Chat необходимо документировать streaming endpoint.

Например:

```text
GET /chat/.../stream
```

или фактически используемый API.

OpenAPI должен описывать:

```text
text/event-stream
```

если используется SSE.

Важно:

**не пытаться заставить обычный generated REST method полностью скрыть особенности streaming**, если generator плохо поддерживает SSE.

Можно иметь отдельный SDK streaming abstraction:

```ts
chat.stream(...)
```

---

# 14.1.26 Download Contract

Для:

```text
Markdown
PDF
JSON
```

документировать:

```text
Content-Type
Content-Disposition
```

и binary response там, где это необходимо.

SDK должен корректно возвращать файл/blob/stream в зависимости от используемой реализации.

---

# 14.1.27 SDK API Surface

После генерации SDK должен предоставлять понятные сервисы.

Например:

```text
auth
users
projects
files
analysis
reports
chat
admin
```

Пример:

```ts
sdk.projects.list(...)
sdk.projects.get(...)
sdk.projects.create(...)
sdk.projects.update(...)
```

И:

```ts
sdk.admin.users.list(...)
sdk.admin.queues.list(...)
sdk.admin.logs.list(...)
```

Точный API зависит от generator, но публичный интерфейс должен быть предсказуемым.

---

# 14.1.28 SDK Configuration

Поддержать конфигурацию:

```text
API_BASE_URL
```

для разных окружений:

```text
development
test
production
```

Например:

```text
Development
http://localhost:3000/api

Production
https://api.example.com/api
```

Конкретные URLs не хардкодить внутри SDK.

---

# 14.1.29 Error Handling

Создать единый тип ошибки SDK.

Например:

```text
ApiError
```

Содержать:

```text
status
code
message
requestId
details
```

если Backend их предоставляет.

Frontend может делать:

```ts
if (error.code === 'PROJECT_NOT_FOUND') {
   ...
}
```

вместо анализа текста:

```ts
if (error.message.includes('not found'))
```

---

# 14.1.30 Request ID

Если Backend использует:

```text
X-Request-ID
```

SDK должен сохранять/передавать соответствующую информацию.

При ошибке frontend должен иметь возможность получить:

```text
requestId
```

для поддержки/debugging.

---

# 14.1.31 SDK Tree Shaking

Проверить, что импорт одного API не тянет весь SDK без необходимости, если используемый generator позволяет это контролировать.

Например:

```ts
import { ProjectsApi } from '@reviewsha/sdk';
```

не должен необоснованно увеличивать bundle.

Это особенно важно для `apps/web`.

---

# 14.1.32 Package Exports

`packages/sdk/package.json` должен корректно экспортировать:

```text
.
```

и при необходимости:

```text
./models
./client
```

Но не следует выставлять наружу внутренние generated implementation details без необходимости.

---

# 14.1.33 Versioning

SDK должен иметь собственную версию.

Например:

```text
@reviewsha/sdk
1.0.0
```

Изменение API contract должно приводить к понятному изменению SDK.

Правило:

```text
Backend Contract
      ↓
OpenAPI
      ↓
SDK version
```

---

# 14.1.34 Breaking Changes

Перед изменением API проверить:

```text
Backend
 ↓
OpenAPI
 ↓
SDK
 ↓
Web
 ↓
Admin
```

Например, удаление:

```text
GET /projects
```

не должно происходить без обновления клиентов.

---

# 14.1.35 CI / Development Command

Добавить root scripts:

```bash
yarn openapi:generate
yarn openapi:validate
yarn sdk:generate
yarn sdk:check
```

Можно объединить:

```bash
yarn sdk:generate
```

в pipeline:

```text
Generate OpenAPI
 ↓
Validate
 ↓
Generate SDK
 ↓
Typecheck
```

---

# 14.1.36 Проверка Drift

Очень важный пункт.

Нужно определить механизм обнаружения:

```text
Backend API
        ≠
Committed OpenAPI
```

и:

```text
OpenAPI
        ≠
Generated SDK
```

Например:

```bash
yarn sdk:generate
git diff --exit-code
```

Если generated SDK изменился после генерации:

```text
FAIL
```

Это предотвращает рассинхронизацию API и SDK.

---

# 14.1.37 Документация API

Swagger UI:

```text
/api/docs
```

должен быть полноценной документацией для разработчика.

Проверить:

* tags;
* descriptions;
* auth;
* request examples;
* response examples;
* errors;
* pagination;
* uploads;
* downloads;
* streaming.

---

# 14.1.38 OpenAPI Artifact

Определить, где хранится generated schema.

Например:

```text
docs/api/openapi.json
```

или:

```text
packages/sdk/openapi.json
```

Главное — выбрать **одно canonical location**.

Не хранить несколько копий OpenAPI без необходимости.

---

# 14.1.39 Автоматические тесты

Так как тестирование у нас идёт параллельно разработке, для `14.1` добавить:

### OpenAPI validation

**5–10 проверок**

Проверить:

* schema valid;
* paths valid;
* `$ref`;
* security;
* DTO schemas;
* responses.

### SDK

**20–30 тестов**

Проверить:

* client configuration;
* auth headers;
* request serialization;
* response parsing;
* errors;
* pagination;
* uploads;
* downloads;
* API methods.

### Integration

**15–20 тестов**

Проверить:

```text
Backend
 ↓
OpenAPI
 ↓
SDK
 ↓
Real API
```

Особенно:

* Auth;
* Projects;
* Upload;
* Reports;
* Chat;
* Admin.

---

# 14.1.40 Contract Tests

Отдельно сделать contract verification.

Принцип:

```text
Controller
   ↓
OpenAPI
   ↓
Expected Contract
```

Проверить, что реальные endpoints соответствуют schema.

Минимум проверить:

* status codes;
* response structure;
* required fields;
* enum values;
* auth requirements.

---

# 14.1.41 Manual QA

Пройти Swagger вручную.

Для основных модулей:

```text
Auth
Users
Projects
Upload
Analysis
Reports
Chat
Admin
```

Проверить:

1. endpoint отображается;
2. параметры корректные;
3. authentication работает;
4. request schema соответствует реальному API;
5. response соответствует документации;
6. ошибки соответствуют контракту.

---

# 14.1.42 Frontend Migration Check

После подключения SDK проверить, что в:

```text
apps/web
apps/admin
```

не осталось необоснованных прямых:

```text
fetch()
axios()
XMLHttpRequest
```

для API бизнес-операций.

Допустимы низкоуровневые исключения, если они специально нужны для streaming/upload и архитектурно обоснованы.

---

# 14.1.43 Documentation

Обновить:

```text
docs/architecture/11-api-contracts.md
docs/architecture/10-frontend.md
```

Добавить:

* OpenAPI source of truth;
* SDK generation;
* SDK structure;
* authentication;
* error contract;
* pagination;
* upload/download;
* streaming;
* versioning;
* contract validation.

Также обновить README:

```text
How to generate SDK
How to validate OpenAPI
How to use SDK
```

---

# 14.1.44 Финальный чек-лист

## OpenAPI

* ☐ Все API endpoints описаны.
* ☐ DTO описаны.
* ☐ Response schemas описаны.
* ☐ Error responses описаны.
* ☐ Auth описан.
* ☐ Roles/permissions отражены.
* ☐ Enums описаны.
* ☐ Pagination унифицирована.
* ☐ Date format унифицирован.
* ☐ Upload описан.
* ☐ Download описан.
* ☐ Streaming описан.
* ☐ Swagger работает.

## SDK

* ☐ SDK генерируется автоматически.
* ☐ Generated code не редактируется вручную.
* ☐ API client существует.
* ☐ Auth работает.
* ☐ Refresh работает.
* ☐ Errors унифицированы.
* ☐ Upload работает.
* ☐ Download работает.
* ☐ Streaming работает.
* ☐ Configuration работает.

## Integration

* ☐ Web использует SDK.
* ☐ Admin использует SDK.
* ☐ Shared types не конфликтуют.
* ☐ Нет дублирования API clients.
* ☐ Нет необоснованных direct fetch/axios.
* ☐ API base URL configurable.

## Contract

* ☐ OpenAPI валиден.
* ☐ SDK соответствует OpenAPI.
* ☐ Drift detection работает.
* ☐ Contract tests проходят.
* ☐ Breaking changes контролируются.

## Quality

* ☐ OpenAPI validation tests.
* ☐ SDK unit tests.
* ☐ Integration tests.
* ☐ Contract tests.
* ☐ Swagger manual QA.
* ☐ Web integration QA.
* ☐ Admin integration QA.

## Documentation

* ☐ `11-api-contracts.md` обновлён.
* ☐ `10-frontend.md` обновлён.
* ☐ README обновлён.
* ☐ SDK generation documented.
* ☐ OpenAPI validation documented.

---

# Критерий завершения

`14.1 OpenAPI & SDK` считается завершённым, когда работает стабильная цепочка:

```text
NestJS Controllers
       ↓
   OpenAPI
       ↓
   Validation
       ↓
 SDK Generation
       ↓
 ┌─────┴─────┐
 ↓           ↓
Web        Admin
```

и при изменении Backend API можно выполнить:

```bash
yarn openapi:validate
yarn sdk:generate
yarn typecheck
```

после чего **Web и Admin получают актуальный типизированный API contract без ручного копирования DTO и endpoint'ов**.

Главный итог `14.1`: **OpenAPI становится контрактом системы, а `packages/sdk` — единым способом работы Web и Admin с Backend API.**


--- SOURCE: pasted-text-6.txt ---

# 14.2 Frontend Integration

**Статус:** ⏳ TODO

## Цель

Полностью перевести `apps/web` и `apps/admin` на единый `@reviewsha/sdk`, созданный в `14.1`, и убрать дублирование API-логики.

Архитектура после этапа:

```text
                    Backend
                       │
                    OpenAPI
                       │
                 @reviewsha/sdk
                  │           │
                  ↓           ↓
               apps/web   apps/admin
```

Главное правило:

> Frontend не должен самостоятельно описывать API-контракты, DTO и URL endpoints.

---

# 14.2.1 SDK Integration Layer

В `apps/web` и `apps/admin` создать единый способ инициализации SDK.

Например:

```text
apps/web/src/
├── api/
│   ├── client.ts
│   ├── auth.ts
│   └── errors.ts
```

и аналогично для Admin.

Но **не копировать SDK implementation** между приложениями.

Общая логика должна находиться в:

```text
packages/sdk
```

Frontend только конфигурирует клиент.

---

# 14.2.2 API Client Factory

Создать factory:

```ts
createApiClient({
  baseUrl,
  getAccessToken,
  onUnauthorized,
})
```

Он должен централизованно решать:

* API URL;
* authentication;
* headers;
* credentials;
* error handling;
* refresh;
* retry.

Не должно быть:

```text
ProjectService → самостоятельно создаёт client
ReportService → самостоятельно создаёт client
ChatService → самостоятельно создаёт client
```

---

# 14.2.3 Environment Configuration

Для Web:

```text
VITE_API_URL
```

Для Admin:

```text
VITE_API_URL
```

или другой принятый в проекте convention.

Проверить окружения:

```text
development
test
production
```

Никаких hardcoded:

```text
http://localhost:3000
```

в feature-коде.

---

# 14.2.4 Authentication Integration

Интегрировать SDK с существующим Auth flow.

```text
Login
 ↓
Access Token
 ↓
SDK
 ↓
Authorization Header
 ↓
API
```

При истечении access token:

```text
API
 ↓
401
 ↓
SDK
 ↓
Refresh
 ↓
New Access Token
 ↓
Retry original request
```

Refresh logic должна быть централизованной.

---

# 14.2.5 Concurrent Refresh

Обязательно избежать ситуации:

```text
Request A → 401
Request B → 401
Request C → 401
```

которая вызывает:

```text
Refresh
Refresh
Refresh
```

Вместо этого:

```text
A ─┐
B ─┼→ single refresh → new token → retry
C ─┘
```

Использовать один refresh promise/lock.

---

# 14.2.6 Logout

При:

* refresh failure;
* invalid refresh token;
* explicit logout;

SDK/Auth layer должен:

```text
clear session
 ↓
clear auth state
 ↓
redirect /login
```

Не допускать бесконечного:

```text
401 → refresh → 401 → refresh
```

---

# 14.2.7 React Query / Data Layer

Если в проекте используется TanStack Query, SDK интегрируется через hooks:

```text
Component
 ↓
useProjects()
 ↓
SDK
 ↓
API
```

Например:

```ts
const { data, isLoading } = useProjects();
```

Не:

```ts
useEffect(() => {
  fetch(...)
}, [])
```

для каждого API endpoint.

---

# 14.2.8 Query Keys

Централизовать query keys.

Например:

```text
projects
projects:list
projects:detail:{id}
reports
reports:detail:{id}
chat
```

Или использовать принятую в проекте структуру.

Главное — отсутствие случайных строк:

```ts
queryKey: ['project']
queryKey: ['projects']
queryKey: ['project-list']
```

для одного и того же ресурса.

---

# 14.2.9 Cache Invalidation

После mutations правильно инвалидировать cache.

Например:

```text
Create Project
 ↓
invalidate projects:list
```

```text
Update Project
 ↓
invalidate projects:list
invalidate projects:{id}
```

```text
Archive Project
 ↓
invalidate projects:list
invalidate projects:{id}
```

---

# 14.2.10 Web: Auth

Перевести:

```text
Login
Register
Refresh
Logout
Current User
```

на SDK.

Проверить:

```text
apps/web/src/features/auth
```

Не должно существовать собственных DTO:

```ts
LoginRequest
LoginResponse
```

если они уже генерируются SDK.

---

# 14.2.11 Web: Dashboard

Dashboard должен получать данные через SDK.

Проверить:

```text
stats
recent projects
recent analyses
activity
```

если они предусмотрены API.

Flow:

```text
Dashboard
 ↓
Query
 ↓
SDK
 ↓
API
```

---

# 14.2.12 Web: Projects

Полностью перевести:

```text
List
Create
Get
Update
Archive
Tags
History
```

на SDK.

Пример:

```text
useProjects()
useProject(id)
useCreateProject()
useUpdateProject()
useArchiveProject()
```

---

# 14.2.13 Web: Upload

Upload API подключить через SDK.

Поток:

```text
Select ZIP
 ↓
Validation
 ↓
SDK upload
 ↓
Backend
 ↓
Version
 ↓
Processing Job
```

Проверить:

* multipart;
* progress;
* cancellation, если предусмотрено;
* errors;
* max file size;
* validation.

Для upload допустим отдельный low-level transport, если generated SDK не умеет корректно поддерживать progress.

Но он должен оставаться частью SDK/API layer, а не бизнес-компонента.

---

# 14.2.14 Web: Analysis

Подключить:

```text
Start Analysis
Get Status
Get Result
```

через SDK.

UI не должен самостоятельно знать:

```text
POST /analysis
GET /analysis/:id
```

Он должен работать с typed API abstraction.

---

# 14.2.15 Web: Reports

Перевести:

```text
List Reports
Get Report
Download Markdown
Download PDF
Download JSON
History
Compare
```

на SDK.

Для файловых ответов правильно обработать:

```text
Blob
Content-Type
Content-Disposition
```

---

# 14.2.16 Web: Chat

Интегрировать обычные API requests:

```text
Create conversation
Get history
Send message
```

через SDK.

Streaming:

```text
Chat UI
 ↓
SDK streaming abstraction
 ↓
SSE / streaming endpoint
```

Не помещать SSE implementation непосредственно в React component.

---

# 14.2.17 Web: Settings

Перевести:

```text
Profile
User settings
Preferences
```

на SDK.

После mutation:

```text
update
 ↓
invalidate current-user
```

---

# 14.2.18 Admin: Authentication

Admin должен использовать тот же SDK:

```text
Login
Refresh
Logout
Current User
```

но дополнительно проверять:

```text
role === ADMIN
```

---

# 14.2.19 Admin: Users

Подключить:

```text
List
Get
Update
Role
Status
```

через SDK.

Проверить:

* pagination;
* filters;
* search;
* mutations;
* errors.

---

# 14.2.20 Admin: Projects

Подключить:

```text
List
Get
Archive
Delete
```

если эти операции предусмотрены Admin API.

---

# 14.2.21 Admin: Queues

Подключить:

```text
Queue list
Queue details
Jobs
Failed jobs
Retry
Remove
```

через SDK.

Особенно важно:

```text
Admin UI
 ↓
SDK
 ↓
Backend
 ↓
BullMQ
```

а не:

```text
Admin UI
 ↓
Redis
```

---

# 14.2.22 Admin: Logs

Подключить:

```text
List
Search
Filter
Details
```

через SDK.

Для больших объёмов:

* pagination;
* server-side filtering;
* server-side search.

---

# 14.2.23 Admin: AI Usage

Подключить:

```text
Summary
By user
By project
By provider
```

через SDK.

Не вычислять стоимость/токены на frontend, если Backend уже предоставляет эти данные.

---

# 14.2.24 Admin: Statistics

Подключить:

```text
Overview
Users
Projects
Analyses
Processing
```

через SDK.

Графики должны получать уже подготовленные Backend данные.

---

# 14.2.25 Error Boundary

API ошибки не должны ломать всё приложение.

Добавить:

```text
React Error Boundary
+
API Error handling
```

Разделить:

```text
UI Error
API Error
Network Error
Auth Error
```

---

# 14.2.26 Error Mapping

Создать единый mapper:

```text
ApiError
 ↓
Frontend Error
 ↓
User-friendly message
```

Например:

```text
PROJECT_NOT_FOUND
        ↓
Project not found
```

Не показывать пользователю:

```text
AxiosError: Request failed with status code 404
```

---

# 14.2.27 Request States

Каждая API feature должна поддерживать:

```text
idle
loading
success
error
```

Для mutations:

```text
pending
success
error
```

UI должен корректно блокировать повторные действия.

---

# 14.2.28 Empty States

Например:

```text
Projects
No projects yet.

[Create Project]
```

```text
Reports
No reports available.
```

```text
Logs
No logs found.
```

Empty state не должен считаться ошибкой.

---

# 14.2.29 Pagination

Все большие коллекции должны использовать API pagination.

Например:

```text
Projects
Users
Reports
Logs
Jobs
Messages
```

Не загружать:

```text
GET /users?limit=100000
```

---

# 14.2.30 Infinite Scroll

Использовать только там, где это оправдано.

Например:

```text
Chat history
Logs
```

Но если API contract использует обычную pagination — frontend должен корректно работать с ней.

---

# 14.2.31 Optimistic Updates

Использовать осторожно.

Допустимо:

```text
Toggle setting
```

если rollback надёжно реализован.

Для критичных операций:

```text
Archive project
Delete
Retry job
```

лучше:

```text
request
 ↓
success
 ↓
update cache
```

---

# 14.2.32 API Request Cancellation

Для длинных запросов поддержать cancellation:

```text
Search
Upload
Analysis
```

если transport это позволяет.

Например:

```text
Navigate away
 ↓
Abort request
```

---

# 14.2.33 Race Conditions

Проверить:

```text
Search A
Search B
```

Если B завершился раньше A, старый response A не должен перезаписать новые данные.

React Query/AbortController должны решать эту проблему.

---

# 14.2.34 Frontend API Boundaries

Запретить feature-компонентам напрямую работать с transport.

Плохо:

```text
ProjectPage
 ↓
fetch()
```

Хорошо:

```text
ProjectPage
 ↓
useProject()
 ↓
SDK
```

---

# 14.2.35 Shared API Utilities

Общие вещи между Web/Admin:

```text
ApiError
Auth handling
Token handling
Request configuration
Pagination helpers
```

по возможности вынести в:

```text
packages/sdk
```

или shared package.

Не копировать.

---

# 14.2.36 Type Safety

После интеграции:

```bash
yarn typecheck
```

не должно быть:

```text
any
```

для API responses без обоснования.

Проверить:

* request types;
* response types;
* enums;
* nullable fields;
* optional fields.

---

# 14.2.37 Удаление Legacy API Layer

После миграции найти:

```text
fetch(
axios(
XMLHttpRequest(
```

и проверить каждое использование.

Возможные причины оставить:

* streaming;
* upload progress;
* browser-specific API.

Если оставляем — должен быть комментарий/архитектурное объяснение.

---

# 14.2.38 Тесты

Поскольку тесты пишутся по ходу разработки, для интеграции добавить ориентир:

### Web

**30–40 тестов**

Проверить:

* auth;
* projects;
* upload;
* analysis;
* reports;
* chat;
* settings;
* API states.

### Admin

**25–35 тестов**

Проверить:

* auth;
* users;
* projects;
* queues;
* logs;
* AI usage;
* statistics.

### SDK integration

**20–30 тестов**

Проверить:

* client;
* auth;
* refresh;
* errors;
* serialization;
* pagination;
* files;
* streaming.

---

# 14.2.39 E2E

Минимальные критические сценарии:

### Web

```text
Login
 ↓
Dashboard
 ↓
Create Project
 ↓
Upload
 ↓
Start Analysis
 ↓
View Report
 ↓
Open Chat
```

### Admin

```text
Login
 ↓
Users
 ↓
Projects
 ↓
Queues
 ↓
Logs
 ↓
AI Usage
 ↓
Statistics
```

---

# 14.2.40 Security

Проверить:

* access token не попадает в URL;
* refresh token не логируется;
* API errors не раскрывают secrets;
* USER не может вызвать Admin API;
* logout очищает session;
* expired token корректно обрабатывается;
* CORS соответствует окружению.

---

# 14.2.41 Performance

Проверить:

* SDK не создаёт новый client на каждый render;
* query cache используется;
* duplicate requests отсутствуют;
* большие списки пагинируются;
* polling ограничен;
* streaming не вызывает лишние React renders;
* generated SDK не раздувает bundle без необходимости.

---

# 14.2.42 Документация

Обновить:

```text
docs/architecture/10-frontend.md
docs/architecture/11-api-contracts.md
README.md
```

Зафиксировать:

* SDK integration;
* API client;
* auth flow;
* refresh flow;
* query/cache strategy;
* error handling;
* streaming;
* upload;
* environment configuration.

---

# 14.2.43 Финальный чек-лист

## SDK

* ☐ Web использует SDK.
* ☐ Admin использует SDK.
* ☐ Один API client.
* ☐ Base URL configurable.
* ☐ Auth централизован.
* ☐ Refresh централизован.
* ☐ Concurrent refresh защищён.
* ☐ Error handling централизован.

## Web

* ☐ Auth.
* ☐ Dashboard.
* ☐ Projects.
* ☐ Upload.
* ☐ Analysis.
* ☐ Reports.
* ☐ Chat.
* ☐ Settings.

## Admin

* ☐ Auth.
* ☐ Users.
* ☐ Projects.
* ☐ Queues.
* ☐ Logs.
* ☐ AI Usage.
* ☐ Statistics.

## Data layer

* ☐ Queries.
* ☐ Mutations.
* ☐ Query keys.
* ☐ Cache invalidation.
* ☐ Pagination.
* ☐ Loading.
* ☐ Empty.
* ☐ Error.
* ☐ Cancellation.

## Security

* ☐ Token handling.
* ☐ Refresh.
* ☐ Logout.
* ☐ Admin authorization.
* ☐ No secrets in logs.
* ☐ No tokens in URLs.

## Quality

* ☐ Unit/component tests.
* ☐ SDK integration tests.
* ☐ E2E critical flows.
* ☐ Typecheck.
* ☐ Manual QA.
* ☐ Performance check.

## Cleanup

* ☐ Legacy API calls removed.
* ☐ Duplicate clients removed.
* ☐ Duplicate DTOs removed.
* ☐ Duplicate auth logic removed.
* ☐ Documentation updated.

---

# Критерий завершения

`14.2` закрыт, когда:

```text
                 OpenAPI
                    ↓
               @reviewsha/sdk
                ↙          ↘
             Web           Admin
              ↓              ↓
          React UI       React UI
```

и **оба приложения используют один типизированный API contract**, а не собственные реализации API.

Ключевая проверка:

```bash
yarn typecheck
yarn build
yarn test
```

должны проходить после полной миграции.

После `14.2` цепочка

```text
Backend → OpenAPI → SDK → Web/Admin
```

становится основной архитектурной границей проекта.


--- SOURCE: pasted-text-8.txt ---

# Этап 12 — Frontend: чек-лист сверки

Цель проверки — убедиться, что **весь пользовательский frontend действительно реализован по PRD + архитектуре**, а не просто существуют страницы и компоненты.

---

## 12.1 Core Application

### UI Kit

* ☐ `packages/ui` реально используется в `apps/web`.
* ☐ Базовые компоненты существуют:

  * ☐ Button
  * ☐ Input
  * ☐ Select
  * ☐ Checkbox
  * ☐ Modal/Dialog
  * ☐ Dropdown
  * ☐ Tabs
  * ☐ Table
  * ☐ Badge
  * ☐ Card
  * ☐ Toast/Alert
  * ☐ Loader/Skeleton
* ☐ Design tokens соответствуют архитектуре.
* ☐ Нет массового дублирования UI-компонентов внутри feature.
* ☐ Состояния компонентов реализованы:

  * ☐ loading
  * ☐ disabled
  * ☐ error
  * ☐ empty
* ☐ UI Kit не содержит бизнес-логику.

### Routing

* ☐ Все пользовательские routes существуют.
* ☐ Protected routes работают.
* ☐ Неавторизованный пользователь → `/login`.
* ☐ Авторизованный пользователь не возвращается на login без причины.
* ☐ Unknown route → 404.
* ☐ Loading состояния маршрутов работают.

### Authentication

* ☐ Login работает.
* ☐ Logout работает.
* ☐ Session restore работает.
* ☐ Access token используется через API layer.
* ☐ Refresh token flow работает.
* ☐ Expired access token обрабатывается.
* ☐ После неудачного refresh пользователь выходит из системы.
* ☐ Auth state не дублируется в нескольких местах.

### Dashboard

* ☐ Dashboard соответствует PRD.
* ☐ Загружается реальная информация.
* ☐ Нет production mock data.
* ☐ Loading state.
* ☐ Empty state.
* ☐ Error state.
* ☐ Основные действия ведут на правильные разделы.

---

# 12.2 User Features

## Projects

* ☐ Список проектов.
* ☐ Создание.
* ☐ Просмотр.
* ☐ Редактирование.
* ☐ Архивация.
* ☐ Теги.
* ☐ История изменений.
* ☐ Pagination/filtering, если предусмотрены API.
* ☐ Loading.
* ☐ Empty.
* ☐ Error.
* ☐ Confirmation для destructive actions.

Проверить полный flow:

```text
Create
  ↓
Open
  ↓
Edit
  ↓
Tag
  ↓
Archive
  ↓
History
```

---

## Upload

* ☐ Upload UI существует.
* ☐ ZIP выбирается корректно.
* ☐ Client-side validation присутствует там, где это предусмотрено.
* ☐ Server-side validation ошибки отображаются.
* ☐ Ограничение размера учитывается.
* ☐ Неподдерживаемый файл отклоняется.
* ☐ Upload progress отображается.
* ☐ Ошибка upload отображается.
* ☐ Повторная загрузка работает.
* ☐ Версия файла отображается.
* ☐ После upload запускается ожидаемый processing flow.

Проверить:

```text
Select ZIP
 ↓
Upload
 ↓
Validation
 ↓
Version
 ↓
Processing
```

---

## Analysis

* ☐ Запуск анализа.
* ☐ Отображение текущего статуса.
* ☐ Processing state.
* ☐ Success state.
* ☐ Failed state.
* ☐ Возможность открыть результат.
* ☐ Polling/realtime обновление работает согласно архитектуре.
* ☐ Нельзя случайно запустить дубликат операции.
* ☐ Ошибки Backend отображаются понятно.

Проверить:

```text
Upload
 ↓
Start Analysis
 ↓
Queued
 ↓
Processing
 ↓
Completed
 ↓
Report
```

---

## Reports

* ☐ Список отчётов.
* ☐ Открытие отчёта.
* ☐ Markdown.
* ☐ PDF.
* ☐ JSON.
* ☐ Download.
* ☐ История анализов.
* ☐ Сравнение анализов.
* ☐ Loading.
* ☐ Empty.
* ☐ Error.

Проверить:

```text
Analysis
 ↓
Report
 ├── Markdown
 ├── PDF
 └── JSON
```

И:

```text
Report History
 ↓
Select A
Select B
 ↓
Compare
```

---

## Chat

* ☐ Chat UI.
* ☐ Создание/открытие conversation.
* ☐ Отправка сообщения.
* ☐ История сообщений.
* ☐ Project context.
* ☐ Streaming.
* ☐ AI response отображается постепенно.
* ☐ Ошибка streaming обрабатывается.
* ☐ Reconnect/retry предусмотрен, если требуется архитектурой.
* ☐ Scroll работает корректно.
* ☐ Нельзя отправлять пустое сообщение.
* ☐ Loading/typing state.
* ☐ Memory/context не реализованы отдельной frontend-логикой в обход Backend.

Проверить:

```text
Project
 ↓
Chat
 ↓
Message
 ↓
Context
 ↓
AI
 ↓
Streaming response
 ↓
History
```

---

## Settings

* ☐ Страница Settings.
* ☐ Profile.
* ☐ Настройки пользователя согласно PRD.
* ☐ Изменение данных работает.
* ☐ Validation.
* ☐ Success feedback.
* ☐ Error feedback.
* ☐ Logout доступен.
* ☐ Никакие чувствительные данные не отображаются без необходимости.

---

# API Integration

Это особенно важно с учётом `14.1–14.2`.

* ☐ Frontend использует `@reviewsha/sdk`.
* ☐ API contract соответствует OpenAPI.
* ☐ Нет самодельных DTO, дублирующих SDK.
* ☐ Нет дублирующего API client.
* ☐ Нет необоснованных `fetch()`/`axios()` в feature-коде.
* ☐ API base URL берётся из environment.
* ☐ Auth headers централизованы.
* ☐ Refresh централизован.
* ☐ API errors централизованно обрабатываются.
* ☐ Request ID доступен для debugging, если предусмотрен Backend.

---

# State Management

Проверить ownership состояния.

### Server state

Через предусмотренный data layer:

* ☐ Projects.
* ☐ Reports.
* ☐ Analysis.
* ☐ Chat history.
* ☐ User data.

### UI state

Локально:

* ☐ Modal.
* ☐ Dropdown.
* ☐ Filters.
* ☐ Form state.
* ☐ Selected items.

Не хранить серверные данные одновременно в нескольких независимых state stores без причины.

---

# UX States

**Каждый основной экран** должен иметь минимум:

```text
Loading
   ↓
Success
   ├── Data
   └── Empty
   ↓
Error
```

Проверить отдельно:

* ☐ Dashboard.
* ☐ Projects.
* ☐ Project details.
* ☐ Upload.
* ☐ Analysis.
* ☐ Reports.
* ☐ Report details.
* ☐ Chat.
* ☐ Settings.

---

# Security

* ☐ Protected routes нельзя открыть без auth.
* ☐ Admin API не вызывается обычным USER.
* ☐ Access token не попадает в URL.
* ☐ Refresh token не выводится в UI.
* ☐ Tokens не попадают в console/logging.
* ☐ Sensitive API responses не сохраняются в небезопасном месте.
* ☐ Logout действительно завершает session.
* ☐ XSS-защита не нарушена использованием raw HTML.
* ☐ Пользователь не может получить данные другого проекта через изменение `id` на frontend.

Последний пункт обязательно проверить вручную через API.

---

# Responsive

Проверить минимум:

* ☐ Desktop.
* ☐ Tablet.
* ☐ Mobile.

Особенно:

* ☐ Sidebar.
* ☐ Tables.
* ☐ Project cards.
* ☐ Upload.
* ☐ Report viewer.
* ☐ Chat.
* ☐ Modals.
* ☐ Forms.

---

# Accessibility

* ☐ Keyboard navigation.
* ☐ Focus states.
* ☐ Labels у inputs.
* ☐ Buttons имеют понятные названия.
* ☐ Dialogs доступны с клавиатуры.
* ☐ Escape закрывает dialogs.
* ☐ Ошибки доступны пользователю.
* ☐ Цвет не является единственным способом передачи состояния.
* ☐ Images имеют `alt`, где требуется.

---

# Performance

* ☐ Нет лишних API requests.
* ☐ Нет request loop.
* ☐ Нет бесконечного polling.
* ☐ Большие списки пагинируются.
* ☐ Heavy components lazy-load, если это необходимо.
* ☐ Reports не блокируют весь UI.
* ☐ Chat streaming не вызывает чрезмерные re-render.
* ☐ Bundle проверен.
* ☐ Production build работает.

---

# Тесты

Поскольку в проекте тестирование теперь пишется **по ходу разработки**, к моменту закрытия этапа 12 должны существовать тесты для всех критических frontend flows.

## Unit / Component

Ориентир:

**80–120 тестов**

Покрыть:

* UI Kit;
* forms;
* validation;
* auth state;
* project components;
* upload;
* analysis states;
* reports;
* chat;
* settings;
* error/loading/empty states.

Количество не является самоцелью: важнее покрыть критическую бизнес-логику и состояния.

---

## Integration

Ориентир:

**40–60 тестов**

Минимум:

```text
Auth
Projects
Upload
Analysis
Reports
Chat
Settings
```

Проверять взаимодействие:

```text
Component
 ↓
Data Layer
 ↓
SDK
 ↓
API
```

---

# E2E

Минимум **10–15 критических сценариев**.

### 1. Authentication

```text
Open app
 ↓
Login
 ↓
Dashboard
```

### 2. Project

```text
Create project
 ↓
Open project
 ↓
Edit
 ↓
Archive
```

### 3. Upload

```text
Project
 ↓
Upload ZIP
 ↓
Processing
```

### 4. Analysis

```text
Upload
 ↓
Start analysis
 ↓
Processing
 ↓
Completed
```

### 5. Reports

```text
Analysis
 ↓
Report
 ↓
PDF / JSON / Markdown
```

### 6. History

```text
Reports
 ↓
History
 ↓
Select two
 ↓
Compare
```

### 7. Chat

```text
Project
 ↓
Chat
 ↓
Send message
 ↓
Streaming response
```

### 8. Settings

```text
Settings
 ↓
Change data
 ↓
Save
 ↓
Reload
 ↓
Verify
```

### 9. Logout

```text
Logout
 ↓
Login page
 ↓
Protected route inaccessible
```

---

# Manual QA

Пройти приложение **как обычный пользователь**, а не разработчик.

## Полный happy path

```text
Register/Login
      ↓
Dashboard
      ↓
Create Project
      ↓
Upload ZIP
      ↓
Wait Processing
      ↓
Start Analysis
      ↓
Wait AI Processing
      ↓
Open Report
      ↓
Download PDF
      ↓
Open History
      ↓
Compare
      ↓
Open Chat
      ↓
Ask Question
      ↓
Streaming Response
      ↓
Settings
      ↓
Logout
```

---

# Negative QA

Обязательно проверить:

* ☐ неправильный login;
* ☐ expired session;
* ☐ невалидный ZIP;
* ☐ слишком большой файл;
* ☐ upload failure;
* ☐ analysis failure;
* ☐ AI provider failure;
* ☐ report generation failure;
* ☐ пустой chat message;
* ☐ network offline;
* ☐ API 400;
* ☐ API 401;
* ☐ API 403;
* ☐ API 404;
* ☐ API 409;
* ☐ API 500.

---

# Проверка соответствия PRD

Отдельно пройти PRD и составить таблицу:

| Требование PRD | Реализовано | UI | API | Тест |
| -------------- | ----------- | -- | --- | ---- |
| Auth           | ☐           | ☐  | ☐   | ☐    |
| Projects       | ☐           | ☐  | ☐   | ☐    |
| Upload         | ☐           | ☐  | ☐   | ☐    |
| Analysis       | ☐           | ☐  | ☐   | ☐    |
| Reports        | ☐           | ☐  | ☐   | ☐    |
| Chat           | ☐           | ☐  | ☐   | ☐    |
| Settings       | ☐           | ☐  | ☐   | ☐    |

**Нельзя закрывать этап только потому, что все страницы существуют.**

---

# Проверка архитектуры

Сверить с:

```text
docs/architecture/10-frontend.md
docs/architecture/11-api-contracts.md
```

Проверить:

* ☐ routing соответствует архитектуре;
* ☐ state ownership соответствует;
* ☐ UI Kit соответствует;
* ☐ SDK используется правильно;
* ☐ API boundaries соблюдаются;
* ☐ auth flow соответствует;
* ☐ upload flow соответствует;
* ☐ analysis flow соответствует;
* ☐ chat flow соответствует.

---

# Проверка кода

* ☐ Нет огромных React компонентов.
* ☐ Нет бизнес-логики внутри UI primitives.
* ☐ Feature boundaries соблюдаются.
* ☐ Нет дублирования компонентов.
* ☐ Нет дублирования API logic.
* ☐ Нет `any` без причины.
* ☐ Нет захардкоженных API URL.
* ☐ Нет production mock data.
* ☐ Нет debug `console.log`.
* ☐ Нет TODO для обязательного MVP-функционала.

---

# Документация

После проверки обновить:

```text
docs/architecture/10-frontend.md
```

Если фактическая реализация отличается от первоначальной архитектуры:

* ☐ зафиксировать изменение;
* ☐ объяснить причину;
* ☐ обновить диаграммы, если затронуты;
* ☐ проверить связанные API contracts.

Также обновить:

```text
README.md
```

если изменился способ запуска frontend.

---

# Итоговый критерий закрытия этапа 12

Этап 12 можно считать **COMPLETE**, когда:

```text
                    apps/web
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
       Auth        Projects      Upload
                       │
                       ↓
                    Analysis
                       │
              ┌────────┴────────┐
              ↓                 ↓
           Reports             Chat
              │                 │
              └────────┬────────┘
                       ↓
                    Settings
```

весь пользовательский flow работает **от login до получения результата анализа и общения с AI**, а frontend:

* использует реальный Backend;
* использует SDK;
* соответствует PRD;
* соответствует архитектуре;
* имеет loading/error/empty states;
* имеет автоматические тесты;
* прошёл E2E;
* прошёл ручной happy-path и negative QA;
* не содержит критического frontend debt.

**Только после этого 12 можно закрывать и переходить дальше.**


--- END OF USER-PROVIDED REQUIREMENTS ---
