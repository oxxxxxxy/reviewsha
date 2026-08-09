# Sequence Diagrams проекта "Ревьюша"

## 1. Назначение документа

Этот документ описывает основные сценарии взаимодействия компонентов системы во времени.

Цель:

- понять полный жизненный цикл операций;
- определить ответственность сервисов;
- зафиксировать порядок вызовов;
- подготовить основу для UML Sequence Diagram.

## 2.1 UploadCompleted и Job Pipeline (Stage 7.2)

Перед AI-частью Worker выполняет файловую цепочку Stage 8.2:

```text
BullMQ file queue
    ↓
DownloadProcessor → MinIO → workspace/archive.zip
    ↓
ExtractProcessor → safe ZIP extraction
    ↓
    ParseProcessor → files/languages/statistics
    ↓
    MergeProcessor → output/context.json
    ↓
AI parser → chunks → prompt builder
    ↓
AIProvider / OmniRouter / DeepSeek
    ↓
response validator → persist request/response/usage
    ↓
issue aggregator → Report + Findings
    ↓
NotifyProcessor → project timestamp + notification
    ↓
CleanupProcessor → remove temporary workspace
    ↓
Reports API → frontend
```

На Stage 7.2 API принимает `UploadCompleted`, создаёт Scan и регистрирует первый
Job через `PipelineService`/`QueueService`. Каждый успешный шаг создаёт следующий
Job; окончательно упавшие jobs сохраняют FAILED state, отправляются в
`dead-letter.queue` и запускают cleanup. Реальное
исполнение шагов выполняется Worker на Stage 8.

```text
Upload API
    ↓
PostgreSQL: UploadedFile COMPLETED
    ↓
UploadEvents: upload.completed
    ↓
PipelineService: create Scan and Extract Job
    ↓
BullMQ / Redis
    ↓
Worker processors (Stage 8)
    ↓
PipelineService: create next Job or dead-letter Job
```

В payload передаются только `uploadId`, `projectId`, `scanId` и другие небольшие
идентификаторы. ZIP-файлы, токены и секреты в Redis Job не передаются.

---

# 2. Основные участники системы

```
User

Frontend

API Gateway / Backend

Auth Module

Projects Module

Files Module

Scan Module

Queue Service

Redis + BullMQ

Worker

AI Service

DeepSeek Provider

PostgreSQL

MinIO
```

---

# 3. Регистрация пользователя

## Сценарий

Пользователь создаёт новый аккаунт.

---

Последовательность:

```
User

↓

Frontend

↓

Auth API

↓

AuthService

↓

PostgreSQL

↓

JWT Generator

↓

Frontend

↓

User
```

---

Шаги:

1. Пользователь отправляет форму регистрации.
2. Frontend валидирует данные.
3. Backend получает запрос.
4. AuthService проверяет существование пользователя.
5. Создаётся запись User.
6. Генерируются Access Token и Refresh Token.
7. Токены возвращаются клиенту.

---

Изменяемые данные:

PostgreSQL:

```
User

RefreshToken
```

---

# 4. Вход пользователя

## Сценарий

Пользователь авторизуется.

---

```
User

↓

Frontend

↓

Auth API

↓

AuthService

↓

PostgreSQL

↓

JWT Service

↓

Frontend
```

---

Проверки:

- пользователь существует;
- пароль корректный;
- аккаунт активен.

---

Результат:

```
Access Token

Refresh Token
```

---

# 5. Создание проекта

## Сценарий

Пользователь создаёт проект для анализа.

---

```
User

↓

Frontend

↓

Projects API

↓

ProjectsService

↓

PostgreSQL

↓

Response

↓

Frontend
```

---

Создаётся:

```
Project
```

---

Данные:

```
name

description

language

ownerId
```

---

# 6. Загрузка проекта

## Сценарий

Пользователь загружает ZIP архив.

---

Полная последовательность:

```
User

↓

Frontend

↓

Files API

↓

FilesService

↓

MinIO

↓

PostgreSQL

↓

Response
```

---

Шаги:

1. Пользователь выбирает архив.
2. Frontend отправляет multipart запрос.
3. Backend проверяет права.
4. Backend загружает файл в MinIO.
5. Создаётся запись File.
6. Возвращается информация о файле.

---

Хранилища:

MinIO:

```
projects/user/project/source.zip
```

PostgreSQL:

```
File
```

---

# 7. Запуск анализа проекта

## Сценарий

Пользователь запускает Code Review.

---

Последовательность:

```
User

↓

Frontend

↓

Scan API

↓

ScanService

↓

PostgreSQL

↓

BullMQ

↓

Redis

↓

Response
```

---

Backend выполняет:

1. Проверяет проект.
2. Создаёт Scan.
3. Устанавливает статус:

```
QUEUED
```

4. Создаёт Job.

---

Создаётся:

```
Scan

Queue Job
```

---

# 8. Выполнение анализа Worker

## Полный pipeline

```
Redis

↓

Worker

↓

Scan Processor

↓

File Processor

↓

Parser

↓

AI Queue

↓

AI Processor

↓

Report Processor

↓

PostgreSQL

↓

MinIO
```

---

# 9. Распаковка проекта

Worker получает задачу:

```
ExtractArchiveJob
```

---

Последовательность:

```
Worker

↓

PostgreSQL

↓

Получение storagePath

↓

MinIO

↓

Download ZIP

↓

Extract

↓

Temp Storage
```

---

После завершения:

```
Scan.status

PROCESSING
```

---

# 10. Анализ структуры проекта

Worker:

```
ParserService
```

---

Процесс:

```
Files

↓

Language Detection

↓

Framework Detection

↓

Project Metadata
```

---

Результат:

```
Project Analysis Context
```

---

# 11. AI анализ кода

## Основной сценарий

```
Worker

↓

AI Queue

↓

Redis

↓

AI Processor

↓

AI Service

↓

DeepSeek API

↓

Response Parser

↓

PostgreSQL
```

---

Для каждого файла:

```
File

↓

Chunk

↓

Prompt

↓

LLM

↓

Issue
```

---

Создаются:

```
Issue records
```

---

# 12. Генерация отчёта

После завершения анализа:

```
Worker

↓

Report Processor

↓

ReportService

↓

Generate PDF/MD/JSON

↓

MinIO

↓

PostgreSQL
```

---

Создаются:

```
Report

ReportFile
```

---

# 13. Обновление прогресса

Во время анализа:

```
Worker

↓

ProgressService

↓

PostgreSQL

↓

Frontend
```

---

Пример:

```
CREATED

↓

QUEUED

↓

EXTRACTING

↓

ANALYZING

↓

REPORTING

↓

COMPLETED
```

---

Frontend получает:

MVP:

```
Polling
```

Будущее:

```
WebSocket
```

---

# 14. AI Chat

## Сценарий

Пользователь задаёт вопрос по отчёту.

---

```
User

↓

Frontend

↓

Chat API (JWT + ownership)

↓

ChatService → Context Builder

↓

Context Builder

↓

BullMQ chat.queue

↓

Worker ChatProcessor

↓

Existing AIService / OmniRouter / DeepSeek

↓

ChatMessage (PostgreSQL)

↓

Response polling with timeout

↓

Frontend
```

---

Контекст:

```
Project Info

+

Report Issues

+

Selected Code

+

User Question
```

---

# 15. Сравнение анализов

## Сценарий

Пользователь сравнивает версии проекта.

---

```
Frontend

↓

Reports API

↓

ReportService

↓

PostgreSQL

↓

Compare Engine

↓

Response
```

---

Сравниваются:

```
Issue Count

Severity

Score

New Issues

Fixed Issues
```

---

# 16. Админская статистика

## Сценарий

Администратор смотрит состояние системы.

---

```
Admin Panel

↓

Admin API

↓

Statistics Service

↓

PostgreSQL

↓

Redis/BullMQ

↓

Response
```

---

Отображается:

- пользователи;
- проекты;
- анализы;
- ошибки;
- AI расходы;
- очередь задач.

---

# 17. Полный жизненный цикл анализа

Итоговая последовательность:

```
Upload

↓

Store File

↓

Create Scan

↓

Queue Job

↓

Worker Started

↓

Extract

↓

Parse

↓

Chunk

↓

AI Analyze

↓

Aggregate Issues

↓

Generate Report

↓

Save Result

↓

Notify User
```

---

# 18. Общая схема взаимодействия

```
                 User

                  |

              Frontend

                  |

              NestJS API

                  |

        ----------------------

        |          |         |

   PostgreSQL   Redis     MinIO

                  |

               Worker

                  |

             AI Pipeline

                  |

              DeepSeek
```

---

# 19. Итог

Sequence архитектура фиксирует:

- кто запускает действие;
- какой сервис отвечает;
- где сохраняются данные;
- где выполняются тяжёлые операции;
- как компоненты взаимодействуют между собой.

Главный принцип:

> Пользователь взаимодействует только с Frontend и API. Все тяжёлые операции выполняются асинхронно через очередь Worker'ами, а результаты сохраняются в PostgreSQL и MinIO.
