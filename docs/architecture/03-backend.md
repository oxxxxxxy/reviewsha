# Архитектура Backend проекта "Ревьюша"

## 1. Назначение документа

Этот документ описывает архитектуру backend-приложения:

- структуру NestJS приложения;
- доменные модули;
- ответственность каждого модуля;
- взаимодействие между модулями;
- DTO;
- сервисы;
- события;
- очереди;
- внешние зависимости.

Backend расположен в:

```
apps/api
```

---

# 2. Общие принципы Backend

Backend построен на:

- NestJS 11;
- TypeScript;
- Prisma ORM;
- PostgreSQL.

Основные принципы:

- модульная архитектура;
- слабая связанность компонентов;
- разделение бизнес-логики и инфраструктуры;
- единый API слой;
- асинхронное выполнение тяжёлых операций.

---

# 3. Ответственность Backend

API отвечает за:

- обработку HTTP запросов;
- авторизацию;
- проверку прав доступа;
- бизнес-правила;
- управление сущностями;
- создание задач;
- получение результатов.

API НЕ отвечает за:

- анализ исходного кода;
- прямые запросы к LLM;
- обработку больших архивов;
- генерацию тяжёлых отчётов.

Эти операции выполняются Worker.

---

# 4. Структура приложения

Предварительная структура:

```
apps/api/src/

├── main.ts
├── app.module.ts
│
├── common/
│   ├── guards/
│   ├── filters/
│   ├── interceptors/
│   ├── decorators/
│   └── pipes/
│
├── config/
│
├── database/
│
└── modules/

    ├── auth/
    ├── users/
    ├── projects/
    ├── files/
    ├── scans/
    ├── reports/
    ├── issues/
    ├── ai/
    ├── queues/
    ├── notifications/
    ├── organizations/
    ├── admin/
    └── health/
```

---

# 5. Доменные модули

## 5.1 Auth Module

Ответственность:

Управление аутентификацией.

Функции:

- регистрация;
- вход;
- выход;
- обновление токенов;
- управление сессиями.

Основные компоненты:

```
AuthController

AuthService

JwtService

TokenService

PasswordService
```

Зависимости:

```
AuthModule

↓

UsersModule

↓

DatabaseModule
```

---

## 5.2 Users Module

Ответственность:

Управление пользователями.

Функции:

- профиль;
- настройки;
- получение информации пользователя.

Сущность:

```
User
```

Компоненты:

```
UsersController

UsersService

UsersRepository
```

---

## 5.3 Projects Module

Ответственность:

Управление проектами пользователя.

Функции:

- создание проекта;
- изменение;
- удаление;
- архивирование;
- получение списка проектов.

Сущность:

```
Project
```

Пример:

```
User

1 ---- N

Project
```

---

## 5.4 Files Module

Ответственность:

Работа с файлами проекта.

Функции:

- загрузка;
- получение метаданных;
- удаление;
- связь с MinIO.

Не хранит сами файлы.

Хранит:

- имя;
- размер;
- путь;
- тип;
- владельца.

---

## 5.5 Scans Module

Ответственность:

Управление процессами анализа.

Сущность:

```
Scan
```

Состояния:

```
CREATED

UPLOADING

QUEUED

PROCESSING

COMPLETED

FAILED
```

Функции:

- создание анализа;
- получение статуса;
- история запусков.

---

## 5.6 Reports Module

Ответственность:

Итоговые результаты анализа.

Функции:

- создание отчёта;
- получение отчёта;
- экспорт;
- история.

Сущность:

```
Report
```

---

## 5.7 Issues Module

Ответственность:

Замечания, найденные AI.

Например:

```
Security

Bug

Architecture

Performance

Style
```

Сущность:

```
Issue
```

Хранит:

- описание;
- уровень критичности;
- файл;
- строку;
- рекомендацию.

---

## 5.8 AI Module

Ответственность:

Абстракция работы с AI.

Backend не знает напрямую о DeepSeek.

Взаимодействие:

```
ReportsModule

↓

AI Module

↓

AI Provider
```

Поддерживает:

- выбор модели;
- создание запросов;
- обработку ошибок;
- статистику использования.

---

## 5.9 Queue Module

Ответственность:

Работа с BullMQ.

Создаёт задачи:

- анализ;
- генерация отчётов;
- уведомления.

Пример:

```
ScanCreatedEvent

↓

Queue

↓

Worker
```

---

## 5.10 Notifications Module

Ответственность:

Уведомления пользователя.

Примеры:

- анализ завершён;
- ошибка анализа;
- новый отчёт.

В будущем:

- WebSocket;
- Email;
- Push.

---

## 5.11 Organizations Module

Подготовка под Team тариф.

Функции:

- организации;
- приглашения;
- роли;
- общий доступ.

---

## 5.12 Admin Module

Ответственность:

Административные операции.

Функции:

- пользователи;
- статистика;
- управление системой;
- просмотр логов.

---

## 5.13 Health Module

Ответственность:

Проверка состояния системы.

Endpoints:

```
GET /health
```

Проверяет:

- API;
- PostgreSQL;
- Redis;
- MinIO.

---

# 6. Общая структура модуля

Каждый модуль придерживается структуры:

```
module/

├── controllers/
│
├── services/
│
├── dto/
│
├── entities/
│
├── repositories/
│
├── events/
│
├── guards/
│
└── module.ts
```

---

# 7. DTO слой

Все входящие данные проходят через DTO.

Пример:

Создание проекта:

```
CreateProjectDto

{
 name: string;

 description?: string;

 language: string;
}
```

Используется:

- class-validator;
- class-transformer.

---

# 8. События

Для слабой связанности используются события.

Примеры:

```
UserRegisteredEvent

ProjectCreatedEvent

ScanStartedEvent

ScanCompletedEvent
```

---

Пример:

```
ScanService

↓

ScanCompletedEvent

↓

NotificationsModule

↓

Уведомление пользователя
```

---

# 9. Очереди Backend

API только создаёт задачи.

Пример:

```
POST /projects/:id/scan

↓

ScanService

↓

BullMQ

↓

Worker
```

API не ждёт результата.

---

# 10. Внешние зависимости

Backend взаимодействует с:

## PostgreSQL

Через Prisma.

---

## Redis

Через:

- BullMQ;
- Cache Manager.

---

## MinIO

Через Storage Service.

---

## AI Provider

Через AI Module.

---

# 11. Guards и Middleware

Общие механизмы:

## JWT Guard

Проверка пользователя.

---

## Roles Guard

Проверка роли.

---

## Validation Pipe

Проверка входных данных.

---

## Exception Filter

Единый формат ошибок.

---

# 12. API стиль

Используется REST API.

Пример:

```
GET /projects

POST /projects

GET /projects/:id

POST /projects/:id/scans

GET /scans/:id

GET /reports/:id
```

---

# 13. Масштабирование

Backend должен позволять:

- запуск нескольких API экземпляров;
- независимое масштабирование Worker;
- добавление новых доменных модулей.

---

# 14. Итоговая архитектура Backend

```
                 API

                  |

    --------------------------------

    Auth

    Users

    Projects

    Files

    Scans

    Reports

    Issues

    AI

    Queue

    Notifications

    Admin

    Health

    --------------------------------

                  |

              PostgreSQL

                  |

          Redis / MinIO / Worker
```

Главный принцип:

> Backend управляет состоянием системы и бизнес-логикой, но тяжёлые операции передаёт специализированным сервисам.

# 15. Детализация Backend для старта разработки

Этот раздел закрывает проектирование Backend до уровня, достаточного для перехода к написанию кода.

---

## 15.1. Полный список Backend модулей MVP

```txt
AppModule
├── ConfigModule
├── DatabaseModule
├── RedisModule
├── StorageModule
├── QueueModule
├── AuthModule
├── UsersModule
├── ProjectsModule
├── FilesModule
├── ScansModule
├── ReportsModule
├── IssuesModule
├── AiModule
├── ChatModule
├── NotificationsModule
├── AdminModule
└── HealthModule
```

### ConfigModule

Ответственность:

- загрузка `.env`;
- валидация env через Zod/Joi;
- предоставление типизированной конфигурации.

Основные зависимости:

- все модули приложения.

---

### DatabaseModule

Ответственность:

- Prisma Client;
- lifecycle подключения;
- транзакции;
- health check PostgreSQL.

Экспортирует:

```txt
PrismaService
TransactionService
```

---

### RedisModule

Ответственность:

- подключение к Redis;
- общий Redis client;
- cache helper;
- lock helper;
- health check Redis.

Экспортирует:

```txt
RedisService
CacheService
LockService
```

---

### StorageModule

Ответственность:

- MinIO client;
- upload/download/delete объектов;
- presigned URLs;
- bucket bootstrap;
- проверка существования объекта.

Экспортирует:

```txt
StorageService
StoragePathService
```

---

### QueueModule

Ответственность:

- регистрация BullMQ очередей;
- добавление jobs;
- чтение статусов jobs;
- retry/cancel;
- приоритеты.

Экспортирует:

```txt
QueueService
ScanQueueProducer
FileQueueProducer
AiQueueProducer
ReportQueueProducer
NotificationQueueProducer
```

---

### AuthModule

Ответственность:

- регистрация;
- логин;
- refresh token;
- logout;
- password hashing;
- guards;
- current user.

Основные сервисы:

```txt
AuthService
TokenService
PasswordService
SessionService
PermissionService
```

---

### UsersModule

Ответственность:

- профиль пользователя;
- изменение имени/аватара;
- настройки;
- deactivate/delete пользователя.

Основные сервисы:

```txt
UsersService
UsersRepository
UserSettingsService
```

---

### ProjectsModule

Ответственность:

- CRUD проектов;
- архивация;
- теги;
- проверка доступа;
- участники проекта в будущих версиях.

Основные сервисы:

```txt
ProjectsService
ProjectsRepository
ProjectAccessService
ProjectStatsService
```

---

### FilesModule

Ответственность:

- загрузка ZIP;
- валидация файла;
- запись метаданных;
- связь файла с проектом;
- безопасное удаление.

Основные сервисы:

```txt
FilesService
FileValidationService
FileMetadataService
```

---

### ScansModule

Ответственность:

- запуск анализа;
- создание Scan;
- прогресс анализа;
- история запусков;
- отмена анализа.

Основные сервисы:

```txt
ScansService
ScanProgressService
ScanAccessService
ScanStatusService
```

---

### ReportsModule

Ответственность:

- получение итогового отчёта;
- список отчётов проекта;
- экспорт PDF/JSON/MD;
- сравнение отчётов.

Основные сервисы:

```txt
ReportsService
ReportExportService
ReportCompareService
```

---

### IssuesModule

Ответственность:

- список замечаний;
- фильтры;
- поиск;
- статусы замечаний;
- группировка по severity/category.

Основные сервисы:

```txt
IssuesService
IssueSearchService
IssueStatsService
```

---

### AiModule

Ответственность:

- единый AI gateway;
- провайдеры моделей;
- учёт стоимости;
- парсинг ответов;
- retry на уровне AI.

Основные сервисы:

```txt
AiService
AiProviderRegistry
AiCostService
AiPromptService
AiResponseParser
```

---

### ChatModule

Ответственность:

- чаты по отчёту;
- история сообщений;
- сбор контекста;
- отправка вопроса в AI.

Основные сервисы:

```txt
ChatService
ChatContextService
MessagesService
```

---

### NotificationsModule

Ответственность:

- уведомления пользователя;
- системные события;
- будущие email/websocket уведомления.

Основные сервисы:

```txt
NotificationsService
NotificationPreferencesService
```

---

### AdminModule

Ответственность:

- пользователи;
- системная статистика;
- очереди;
- логи;
- AI расходы.

Основные сервисы:

```txt
AdminUsersService
AdminStatsService
AdminQueuesService
AdminAiUsageService
```

---

### HealthModule

Ответственность:

- `/health`;
- проверка PostgreSQL;
- проверка Redis;
- проверка MinIO;
- readiness/liveness для Kubernetes.

---

## 15.2. Стандартная структура NestJS модуля

Каждый доменный модуль строится одинаково:

```txt
modules/projects/
├── projects.module.ts
├── projects.controller.ts
├── projects.service.ts
├── projects.repository.ts
├── dto/
│   ├── create-project.dto.ts
│   ├── update-project.dto.ts
│   ├── project-query.dto.ts
│   └── project-response.dto.ts
├── events/
│   ├── project-created.event.ts
│   └── project-archived.event.ts
└── policies/
    └── project-access.policy.ts
```

Поток вызова:

```txt
Controller
  ↓
DTO Validation
  ↓
Service
  ↓
Policy / Access Check
  ↓
Repository
  ↓
Prisma
  ↓
PostgreSQL
```

Для операций, создающих фоновые задачи:

```txt
Controller
  ↓
Service
  ↓
Repository: create DB record
  ↓
Queue Producer: add job
  ↓
Response 202 Accepted
```

---

## 15.3. DTO каталог MVP

DTO должны быть классами NestJS с `class-validator` и Swagger decorators.

### Auth DTO

```txt
RegisterDto
LoginDto
RefreshTokenDto
LogoutDto
AuthTokensDto
CurrentUserDto
```

`RegisterDto`:

```ts
class RegisterDto {
  email: string;        // required, email, max 255
  password: string;     // required, min 8, max 128
  name?: string;        // optional, max 100
}
```

`LoginDto`:

```ts
class LoginDto {
  email: string;        // required, email
  password: string;     // required
}
```

`RefreshTokenDto`:

```ts
class RefreshTokenDto {
  refreshToken: string; // required
}
```

---

### Users DTO

```txt
UpdateProfileDto
UserResponseDto
UserSettingsDto
```

`UpdateProfileDto`:

```ts
class UpdateProfileDto {
  name?: string;        // optional, 1..100
  avatarFileId?: string;// optional, uuid
}
```

---

### Projects DTO

```txt
CreateProjectDto
UpdateProjectDto
ProjectQueryDto
ProjectResponseDto
ArchiveProjectDto
```

`CreateProjectDto`:

```ts
class CreateProjectDto {
  name: string;         // required, 1..120
  description?: string; // optional, max 2000
  language?: string;    // optional, max 50
  tags?: string[];      // optional, max 20 items, item max 40
}
```

`UpdateProjectDto`:

```ts
class UpdateProjectDto {
  name?: string;
  description?: string;
  language?: string;
  tags?: string[];
  isArchived?: boolean;
}
```

`ProjectQueryDto`:

```ts
class ProjectQueryDto {
  page?: number;        // default 1
  limit?: number;       // default 20, max 100
  search?: string;
  language?: string;
  tag?: string;
  archived?: boolean;
  sort?: 'createdAt' | 'updatedAt' | 'name';
  order?: 'asc' | 'desc';
}
```

---

### Files DTO

```txt
UploadProjectArchiveDto
FileResponseDto
FileQueryDto
```

`UploadProjectArchiveDto` описывает multipart форму:

```ts
class UploadProjectArchiveDto {
  projectId: string;    // path param uuid
  file: Express.Multer.File; // zip archive
}
```

Правила валидации файла:

```txt
extension: .zip
mime: application/zip или application/x-zip-compressed
maxSize MVP: 50 MB
maxFilesInside MVP: 5000
blockedPaths: ../, absolute paths, symlinks
blockedDirs: node_modules, .git, dist, build, coverage
```

---

### Scans DTO

```txt
CreateScanDto
ScanStatusDto
ScanHistoryQueryDto
ScanResponseDto
CancelScanDto
```

`CreateScanDto`:

```ts
class CreateScanDto {
  projectId: string;    // uuid
  fileId?: string;      // optional uuid, latest project archive by default
  mode?: 'FAST' | 'FULL';
  options?: {
    includeSecurity?: boolean;
    includePerformance?: boolean;
    includeStyle?: boolean;
    maxAiCostUsd?: number;
  };
}
```

---

### Reports DTO

```txt
ReportResponseDto
ReportQueryDto
ReportIssueQueryDto
ExportReportDto
CompareReportsDto
```

`ReportIssueQueryDto`:

```ts
class ReportIssueQueryDto {
  severity?: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category?: 'ARCHITECTURE' | 'BUG' | 'SECURITY' | 'PERFORMANCE' | 'STYLE';
  status?: 'OPEN' | 'RESOLVED' | 'IGNORED';
  search?: string;
  page?: number;
  limit?: number;
}
```

`ExportReportDto`:

```ts
class ExportReportDto {
  format: 'pdf' | 'json' | 'md';
}
```

---

### Chat DTO

```txt
CreateChatDto
SendMessageDto
ChatResponseDto
MessageResponseDto
```

`CreateChatDto`:

```ts
class CreateChatDto {
  reportId: string;     // uuid
  title?: string;       // optional, max 120
}
```

`SendMessageDto`:

```ts
class SendMessageDto {
  message: string;      // required, 1..8000
  selectedIssueId?: string;
  selectedFilePath?: string;
}
```

---

### Admin DTO

```txt
AdminUserQueryDto
AdminUpdateUserDto
AdminStatsQueryDto
AdminQueueQueryDto
AdminRetryJobDto
```

---

## 15.4. Validation rules

Общие правила:

```txt
whitelist: true
forbidNonWhitelisted: true
transform: true
```

Все входные DTO:

- не принимают лишние поля;
- валидируют UUID;
- нормализуют page/limit;
- ограничивают длину строк;
- валидируют enum значения;
- не принимают HTML без явной необходимости.

---

## 15.5. Backend dependency graph

```txt
AppModule
├── ConfigModule
├── DatabaseModule ← ConfigModule
├── RedisModule ← ConfigModule
├── StorageModule ← ConfigModule
├── QueueModule ← RedisModule, ConfigModule
├── AuthModule ← UsersModule, DatabaseModule, RedisModule
├── UsersModule ← DatabaseModule, StorageModule
├── ProjectsModule ← DatabaseModule, UsersModule
├── FilesModule ← DatabaseModule, StorageModule, ProjectsModule
├── ScansModule ← DatabaseModule, ProjectsModule, FilesModule, QueueModule
├── ReportsModule ← DatabaseModule, StorageModule, ProjectsModule
├── IssuesModule ← DatabaseModule, ReportsModule
├── AiModule ← ConfigModule, DatabaseModule
├── ChatModule ← DatabaseModule, ReportsModule, AiModule
├── NotificationsModule ← DatabaseModule, QueueModule
├── AdminModule ← UsersModule, ScansModule, ReportsModule, QueueModule, AiModule
└── HealthModule ← DatabaseModule, RedisModule, StorageModule
```

Правило:

> Доменные модули не должны напрямую зависеть от Worker. Связь только через QueueModule и БД.

---

## 15.6. События домена

События используются для слабой связности между модулями и для создания фоновых задач.

### События Auth

```txt
UserRegistered
UserLoggedIn
UserLoggedOut
RefreshTokenRotated
PasswordChanged
```

### События Project

```txt
ProjectCreated
ProjectUpdated
ProjectArchived
ProjectDeleted
ProjectMemberAdded
ProjectMemberRemoved
```

### События File

```txt
ProjectArchiveUploaded
ProjectArchiveValidated
ProjectArchiveRejected
ProjectArchiveDeleted
```

### События Scan

```txt
ScanCreated
ScanQueued
ScanStarted
ScanProgressUpdated
ScanFailed
ScanCompleted
ScanCancelled
```

### События AI

```txt
AiRequestCreated
AiRequestCompleted
AiRequestFailed
AiBudgetExceeded
```

### События Report

```txt
ReportGenerationStarted
ReportGenerated
ReportExportRequested
ReportExportGenerated
```

### События Notification

```txt
NotificationCreated
NotificationRead
```

Формат события:

```ts
type DomainEvent = {
  id: string;
  type: string;
  actorUserId?: string;
  aggregateId: string;
  aggregateType: string;
  payload: Record<string, unknown>;
  createdAt: string;
  correlationId: string;
};
```

MVP может публиковать события in-process через Nest EventEmitter. Позже можно заменить на outbox pattern.

---

## 15.7. События → очереди

```txt
ProjectArchiveUploaded
  → file.extract job

ScanCreated
  → scan.start job

ScanStarted
  → file.extract job
  → file.validate job
  → code.parse job
  → code.chunk job
  → ai.analyze jobs

AiRequestCompleted
  → scan.aggregate job when all chunks completed

ScanCompleted
  → report.generate job
  → notification.scan_completed job

ReportGenerated
  → notification.report_ready job
```

---

## 15.8. Repository слой

Репозитории инкапсулируют Prisma queries.

Пример:

```txt
ProjectsService
  ↓
ProjectsRepository
  ↓
Prisma.project
```

Репозитории не должны:

- содержать бизнес-правила;
- вызывать очереди;
- обращаться к HTTP;
- обращаться к MinIO напрямую.

---

## 15.9. Минимальные Backend endpoints для MVP

```txt
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:projectId
PATCH  /api/v1/projects/:projectId
DELETE /api/v1/projects/:projectId
POST   /api/v1/projects/:projectId/archive

POST   /api/v1/projects/:projectId/files/archive
GET    /api/v1/projects/:projectId/files

POST   /api/v1/projects/:projectId/scans
GET    /api/v1/projects/:projectId/scans
GET    /api/v1/scans/:scanId
POST   /api/v1/scans/:scanId/cancel

GET    /api/v1/reports/:reportId
GET    /api/v1/reports/:reportId/issues
POST   /api/v1/reports/:reportId/export
POST   /api/v1/reports/compare

POST   /api/v1/reports/:reportId/chats
GET    /api/v1/chats/:chatId/messages
POST   /api/v1/chats/:chatId/messages

GET    /api/v1/admin/stats
GET    /api/v1/admin/users
GET    /api/v1/admin/queues
POST   /api/v1/admin/queues/:queueName/jobs/:jobId/retry

GET    /api/v1/health
```

---

# 17. Реализация Stage 3: DatabaseModule, PrismaService и Repository Layer

## 17.1 DatabaseModule

Runtime-доступ Backend API к PostgreSQL реализован через глобальный `DatabaseModule`:

```txt
apps/api/src/database/
├── database.module.ts
└── prisma.service.ts
```

`PrismaService` является единственным runtime-wrapper над Prisma Client в `apps/api/src/**`:

- наследует `PrismaClient`;
- использует Prisma 7 и `@prisma/adapter-pg`;
- получает `DATABASE_URL` из `ConfigModule`;
- открывает соединение в `onModuleInit()`;
- закрывает соединение в `onModuleDestroy()`;
- предоставляет `healthCheck()` через `SELECT 1`;
- поддерживает `$transaction()` для будущих доменных сервисов.

## 17.2 Repository Layer

Data Access Layer вынесен в `RepositoriesModule`:

```txt
apps/api/src/repositories/
├── base
├── user
├── project
├── upload
├── scan
├── report
├── finding
├── auth
├── queue
└── chat
```

Реализованы репозитории для ключевых MVP-сущностей:

- `UserRepository`;
- `ProjectRepository`;
- `UploadedFileRepository`;
- `ScanRepository`;
- `ReportRepository`;
- `FindingRepository`;
- `RefreshTokenRepository`;
- `QueueJobRepository`;
- `ChatSessionRepository`;
- `ChatMessageRepository`.

Каждый репозиторий имеет интерфейс и получает `PrismaService` через NestJS DI.

## 17.3 Правила доступа к данным

```txt
Controller
  ↓
Service
  ↓
Repository Interface
  ↓
Repository Implementation
  ↓
PrismaService
  ↓
PostgreSQL
```

Правила:

- доменные сервисы не вызывают `prisma.<model>.*` напрямую;
- Repository не содержит бизнес-логики и HTTP/Nest exceptions;
- multi-entity write операции выполняются через транзакции;
- общие CRUD-примитивы находятся в `BaseRepository`;
- инфраструктурный `HealthService` может использовать `PrismaService.healthCheck()` для проверки доступности БД.

---

# 18. Реализация Stage 4.1: UsersModule

`UsersModule` — первый доменный Backend-модуль. Он реализует CRUD пользователей и инфраструктуру, которую в следующем этапе будет использовать `AuthModule`.

## 18.1 Структура

```txt
apps/api/src/modules/users/
├── users.module.ts
├── controllers/users.controller.ts
├── services/users.service.ts
├── repositories/user.repository.ts
├── dto
├── mappers
├── validators
├── guards
├── decorators
├── constants
├── interfaces
└── types
```

## 18.2 Слойность

```txt
UsersController
  ↓
UsersService
  ↓
UserRepository
  ↓
PrismaService
```

`UsersService` содержит бизнес-логику и не обращается к Prisma напрямую.

## 18.3 REST API

Под глобальным prefix `/api/v1` доступны:

```txt
GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
DELETE /users/:id
```

## 18.4 DTO и ответы

- `CreateUserDto`: `email`, `password`, `displayName`.
- `UpdateUserDto`: `displayName`, `avatarUrl`, `isActive`.
- `UserQueryDto`: `page`, `limit`, `search`, `sort`, `order`.
- `UserResponseDto` не содержит `passwordHash`.

## 18.5 Поиск и сортировка

Поиск выполняется по `email` и `displayName`.

Сортировка поддерживает `createdAt`, `displayName`, `email`.

## 18.6 Auth boundary

`UsersModule` не выполняет login, token issuing, refresh token rotation и access guards. Эти функции относятся к будущему `AuthModule`.


---

# 19. Реализация Stage 4.2: AuthModule

`AuthModule` реализует регистрацию, вход, выход, refresh rotation, текущего пользователя и базовую ролевую авторизацию.

## 19.1 Слойность

```txt
AuthController
  ↓
AuthService
  ↓
UserRepository + RefreshTokenRepository
  ↓
PrismaService
```

Прямые обращения к Prisma из `AuthService` отсутствуют.

## 19.2 Структура

```txt
apps/api/src/modules/auth/
├── auth.module.ts
├── controllers
├── services
├── strategies
├── guards
├── decorators
├── dto
├── constants
└── types
```

## 19.3 API

```txt
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/logout-all
POST /auth/refresh
GET  /auth/me
```

## 19.4 Security

- passwords: Argon2;
- access tokens: JWT, not persisted;
- refresh tokens: JWT + DB hash;
- refresh rotation: enabled;
- multi-device sessions: enabled;
- roles: `ADMIN`, `USER`;
- Swagger Bearer auth: enabled.

---

# 20. Реализация Stage 4.3: JWT Infrastructure

JWT вынесен в инфраструктурный слой AuthModule.

## Компоненты

```txt
ConfigModule
  ↓
jwt.config.ts
  ↓
TokenService
  ↓
JwtAuthGuard / RefreshAuthGuard
  ↓
AuthController / future protected modules
```

## Правило зависимости

Backend-сервисы не вызывают `JwtService.sign()` и `JwtService.verify()` напрямую. Генерация, проверка, decode, hash Refresh Token и mapping JWT ошибок выполняются через `TokenService`.

## Защищённые маршруты

`JwtAuthGuard` и `RefreshAuthGuard` используют `TokenService`, загружают пользователя через `UserRepository`, проверяют `isActive` и записывают минимальный `request.user`.

---

# 21. Реализация Stage 4.5: Guards

Guards и auth decorators вынесены из доменного AuthModule в общий инфраструктурный слой:

```txt
apps/api/src/common/auth
```

## 21.1 Guards

Реализованы:

- `JwtAuthGuard`;
- `RefreshAuthGuard`;
- `RolesGuard`;
- `OwnershipGuard`;
- `ApiKeyGuard`.

## 21.2 Decorators

Реализованы:

- `@Public()`;
- `@CurrentUser()`;
- `@Roles()`;
- `@Ownership()`.

## 21.3 Global protection

`JwtAuthGuard` подключён глобально через `APP_GUARD` в `AppModule`.

Все endpoint приватные по умолчанию. Публичные endpoint должны быть явно отмечены `@Public()`.

## 21.4 Ownership

`OwnershipGuard` содержит инфраструктуру проверки владения ресурсом. До появления доменных сервисов он безопасно запрещает доступ, если checker не настроен.

## 21.5 API Key

`ApiKeyGuard` проверяет заголовок `x-api-key` against `INTERNAL_API_KEY`. Используется как база для будущих worker/webhook/CLI/internal endpoint.

---

# 22. Реализация Stage 4.6: Roles & Authorization

Централизованная RBAC-инфраструктура находится в:

```txt
apps/api/src/common/authorization
```

## 22.1 Role constants

Глобальные роли экспортируются через `APP_ROLES`.

```txt
APP_ROLES.USER
APP_ROLES.ADMIN
```

Контроллеры и политики не должны использовать строковые литералы ролей.

## 22.2 Authorization policies

Все правила доступа описаны в `AUTHORIZATION_POLICIES`.

Примеры:

- `AUTHORIZATION_POLICIES.auth.currentUser`;
- `AUTHORIZATION_POLICIES.sessions.readOwn`;
- `AUTHORIZATION_POLICIES.users.manage`;
- `AUTHORIZATION_POLICIES.projects.readOwnOrAdmin`;
- `AUTHORIZATION_POLICIES.admin.accessPanel`.

## 22.3 Explicit endpoint access

Каждый endpoint должен быть явно помечен:

- `@Public()` для публичных маршрутов;
- `@Roles(...)` для защищённых маршрутов.

`RolesGuard` подключён глобально и использует metadata из `@Roles(...)`.

## 22.4 Owner override

Политики поддерживают `ownershipRequired`. Для будущих Projects/Scans/Reports это позволит комбинировать:

```txt
@Roles(...policy.roles)
@Ownership('project')
```

ADMIN сможет обходить ownership-check в доменном checker-слое, а USER будет ограничен собственными ресурсами.

## 22.5 Permission-based readiness

Добавлены future permission constants:

- `projects.read`;
- `projects.create`;
- `projects.update`;
- `projects.delete`;
- `users.manage`;
- `reports.export`.
