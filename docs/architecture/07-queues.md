# Архитектура очередей проекта "Ревьюша"

> **Historical architecture note.** This numbered design document predates the current canonical architecture index. Verify all claims against code.

## 1. Назначение документа

Этот документ описывает систему фоновых задач:

- очереди BullMQ;
- типы задач;
- жизненный цикл Job;
- обработку ошибок;
- retry;
- взаимодействие API и Worker.

Используемые технологии:

```
Redis

+

BullMQ
```

Реализация Stage 7.1 находится в `apps/api/src/modules/queue`. `QueueModule`
регистрирует очереди через `@nestjs/bullmq`, а `QueueService` является единой
точкой добавления и управления Job. Worker использует те же имена очередей через
`@reviewsha/config`, поэтому строковые имена не дублируются.

Redis конфигурируется через `REDIS_URL` или набор `REDIS_HOST`, `REDIS_PORT`,
`REDIS_PASSWORD`, `REDIS_DB`. API health endpoint проверяет PostgreSQL, Redis и
MinIO.

---

# 2. Зачем нужны очереди

Анализ кода может занимать:

- секунды;
- минуты;
- десятки минут.

HTTP запрос не должен ждать завершения анализа.

Неправильно:

```
User

↓

API

↓

AI анализ

↓

10 минут ожидания

↓

Response
```

---

Правильно:

```
User

↓

API

↓

Создание Job

↓

Ответ пользователю

↓

Worker

↓

Результат
```

---

# 3. Общая архитектура

```
              API

               |

          BullMQ Queue

               |

             Redis

               |

             Worker

               |

        Processing Pipeline
```

---

# 4. Основные очереди

Система использует отдельные очереди по типам задач.

Структура:

```
queues/

├── scan.queue

├── file.queue

├── ai.queue

├── report.queue

├── notification.queue

└── dead-letter.queue
```

Все Job имеют envelope `{ id, type, payload, createdAt }`. В `payload` разрешены
только JSON-safe идентификаторы (`uploadId`, `projectId`, `scanId` и подобные).
Бинарные данные, секреты и токены отклоняются. Общая политика BullMQ: 3 попытки,
exponential backoff с задержкой 1 секунда, completed jobs удаляются, failed jobs
сохраняются для диагностики.

## QueueService API

```text
addJob(queue, type, payload)
getJob(queue, id)
getJobStatus(queue, id)
removeJob(queue, id)
retryJob(queue, id)
pauseQueue(queue)
resumeQueue(queue)
```

Доменный код не создаёт BullMQ Queue напрямую. События `queue.job.created`,
`queue.job.completed` и `queue.job.failed` используются pipeline orchestration.
Окончательно неуспешные задачи попадают в `dead-letter.queue` для диагностики и
ручного retry.

## 4.1 Job Pipeline (Stage 7.2)

`apps/api/src/modules/pipeline` связывает `upload.completed` с цепочкой:

```text
UploadCompleted → extract → parse → analyze → merge → report → notify
```

Каждый переход создаёт отдельный Job с payload `{ pipelineId, projectId, uploadId,
step }`. Состояние и прогресс сохраняются в `Scan`; повторная доставка события
идемпотентна по `sourceFileId`. Временные ошибки повторяются до трёх попыток с
exponential backoff, а постоянные ошибки переводят pipeline в `FAILED` и создают
dead-letter Job. Реальные processors реализуются Worker на Stage 8.

Для мониторинга `QueueService` предоставляет counts по каждой очереди, а
`PipelineService.getMetrics()` объединяет их с количеством pipeline в статусах
`PENDING`, `RUNNING`, `COMPLETED`, `FAILED` и `CANCELLED`. API статуса pipeline:
`GET /api/v1/pipelines/:id`; владелец может также вызвать `resume` и `cancel`.

---

# 5. Scan Queue

Главная очередь анализа.

Назначение:

Запуск полного анализа проекта.

Queue:

```
scan
```

---

Job:

```
ScanProjectJob
```

Payload:

```json
{
 "scanId": "123",
 "projectId": "456"
}
```

---

Pipeline:

```
Scan Created

↓

scan.queue

↓

Worker

↓

Extract

↓

Parse

↓

Analyze

↓

Report
```

---

# 6. File Queue

Работа с файлами.

Queue:

```
file
```

---

Задачи:

## ExtractArchiveJob

Распаковка ZIP.

Payload:

```json
{
 "fileId": "123"
}
```

---

## ValidateProjectJob

Проверка структуры проекта.

Проверяет:

- package.json;
- requirements.txt;
- языки;
- размер.

---

# 7. AI Queue

Очередь запросов к LLM.

Queue:

```
ai
```

---

Задачи:

## AnalyzeCodeJob

Анализ отдельных файлов.

Payload:

```json
{
 "scanId": "123",
 "fileId": "456",
 "language": "typescript"
}
```

---

## GenerateFixJob

Создание рекомендаций.

Например:

```
Issue

↓

AI

↓

Solution
```

---

# 8. Report Queue

Генерация отчётов.

Queue:

```
report
```

---

Job:

```
GenerateReportJob
```

Создаёт:

```
PDF

Markdown

JSON
```

---

# 9. Notification Queue

Уведомления.

Queue:

```
notification
```

---

Задачи:

```
SendEmailJob

SendWebsocketJob
```

---

Пример:

```
Analysis Completed

↓

Notification Queue

↓

User receives message
```

---

# 10. Полный pipeline анализа

Главный сценарий:

```
User uploads project

        |

        ↓

Create Scan

        |

        ↓

scan.queue

        |

        ↓

Extract files

        |

        ↓

Parse code

        |

        ↓

Create AI jobs

        |

        ↓

Analyze chunks

        |

        ↓

Merge results

        |

        ↓

Generate report

        |

        ↓

Notify user
```

---

# 11. Статусы Job

Каждая задача имеет состояние BullMQ.

Основные:

```
WAITING

ACTIVE

COMPLETED

FAILED

DELAYED
```

---

Дополнительно хранится бизнес-статус в PostgreSQL:

Например:

```
Scan.status

CREATED

QUEUED

PROCESSING

COMPLETED

FAILED
```

---

# 12. Retry политика

Ошибки делятся на два типа.

---

## Временные ошибки

Повторяем.

Примеры:

- AI timeout;
- Redis ошибка;
- сеть.

Настройки:

```
attempts: 3

backoff: exponential
```

---

## Постоянные ошибки

Не повторяем.

Примеры:

- повреждённый ZIP;
- неподдерживаемый проект;
- ошибка валидации.

---

# 13. Приоритеты задач

Очереди поддерживают приоритет.

Пример:

```
Enterprise

↓

High Priority


Free User

↓

Normal Priority
```

---

# 14. Ограничение нагрузки

AI запросы ограничиваются.

Причины:

- стоимость;
- лимиты API;
- нагрузка.

Пример:

```
AI Queue

concurrency = 5
```

---

# 15. Idempotency

Каждая задача должна быть безопасна при повторном запуске.

Пример:

Если:

```
GenerateReportJob
```

запустился дважды:

Не должно быть:

```
report.pdf

report-copy.pdf

report-copy2.pdf
```

---

Используется:

```
scanId

+

jobId
```

---

# 16. Хранение результатов

Queue хранит только состояние выполнения.

Результаты:

```
PostgreSQL

+

MinIO
```

---

Например:

BullMQ:

```
Job completed
```

PostgreSQL:

```
Scan.completedAt
```

MinIO:

```
report.pdf
```

---

# 17. Связь API и Queue

Пример:

Пользователь запускает анализ:

```
POST /projects/:id/scan
```

---

Backend:

```
ScanService

↓

Создание Scan

↓

QueueService

↓

BullMQ

↓

Worker
```

---

# 18. Связь Worker и Queue

Worker подписывается:

```
scan.queue

file.queue

ai.queue

report.queue
```

---

Пример:

```
Worker

↓

ScanProcessor

↓

AnalyzeProject()
```

---

# 19. Мониторинг очередей

В админке отображается:

- активные задачи;
- ошибки;
- время выполнения;
- количество задач;
- AI расходы.

---

Используется:

```
Bull Board
```

---

# 20. Будущие расширения

Можно добавить:

- распределённые Worker;
- несколько AI провайдеров;
- отдельные очереди для тарифов;
- расписания;
- повторные анализы;
- webhook события.

---

# 21. Итоговая схема

```
                    API

                     |

                Queue Service

                     |

                   Redis

                     |

        ----------------------------

        |            |             |

      Scan         AI          Report

        |            |             |

        ----------------------------

                     |

                  Worker

                     |

               Result Storage

                     |

              PostgreSQL + MinIO
```

Главный принцип:

> Любая операция, которая может занять больше нескольких секунд, должна выполняться через очередь, а не внутри HTTP запроса.

# 22. Redis Cache Strategy

Redis используется не только для BullMQ, но и для временного кэша. Критические данные всегда хранятся в PostgreSQL.

---

## 22.1. Что кэшируем в MVP

| Данные | Key pattern | TTL | Инвалидация |
| ------ | ----------- | --- | ----------- |
| Current user/session | `session:{sessionId}` | 15 минут | logout, refresh rotation |
| Права пользователя на проект | `project-access:{projectId}:{userId}` | 5 минут | ProjectMember changed, Project archived/deleted |
| Список проектов пользователя | `user-projects:{userId}:{hash(query)}` | 60 секунд | Project created/updated/deleted |
| Статус scan | `scan-status:{scanId}` | 10 секунд | ScanProgressUpdated |
| Прогресс scan | `scan-progress:{scanId}` | 10 секунд | ScanProgressUpdated |
| Summary отчёта | `report-summary:{reportId}` | 5 минут | ReportGenerated, Issue updated |
| AI ответ по chunk hash | `ai-cache:{model}:{promptHash}` | 7 дней | ручная очистка/смена promptVersion |
| Rate limit login | `rl:login:{ip}` | 15 минут | TTL |
| Rate limit API | `rl:api:{userId}:{route}` | 1 минута | TTL |
| Distributed lock | `lock:{resource}:{id}` | 30-300 секунд | release или TTL |

---

## 22.2. Стратегии

### Cache Aside

Для обычных чтений:

```txt
API → Redis get
  hit  → response
  miss → PostgreSQL → Redis set → response
```

Используется для:

- project access;
- report summary;
- user projects.

---

### Short TTL Polling Cache

Для прогресса анализа:

```txt
Frontend polling → API → Redis scan-progress
```

Worker пишет прогресс одновременно в PostgreSQL и Redis.

Redis даёт быстрые ответы, PostgreSQL остаётся источником истины.

---

### Idempotency Cache

Для защиты повторного запуска задач:

```txt
idempotency:scan-create:{projectId}:{fileHash}:{mode}
```

TTL:

```txt
10 минут
```

---

## 22.3. Инвалидация

```txt
ProjectCreated       → delete user-projects:{userId}:*
ProjectUpdated       → delete user-projects:{userId}:*, project-access:{projectId}:*
ProjectArchived      → delete user-projects:{userId}:*, project-access:{projectId}:*
ProjectMemberAdded   → delete project-access:{projectId}:{userId}
ProjectMemberRemoved → delete project-access:{projectId}:{userId}
ScanProgressUpdated  → set scan-progress:{scanId}, scan-status:{scanId}
ReportGenerated      → delete report-summary:{reportId}
IssueUpdated         → delete report-summary:{reportId}
UserLoggedOut        → delete session:{sessionId}
```

Для wildcard-инвалидации в production желательно хранить индекс ключей:

```txt
cache-index:user-projects:{userId}
cache-index:project-access:{projectId}
```

---

## 22.4. Redis key namespaces

```txt
bull:*                 BullMQ internal keys
session:*              sessions
cache:*                generic cache
project-access:*       permissions cache
user-projects:*        user projects list cache
scan-status:*          scan status cache
scan-progress:*        scan progress cache
report-summary:*       report summary cache
ai-cache:*             AI response cache
rl:*                   rate limiting
lock:*                 distributed locks
idempotency:*          idempotency keys
```

---

## 22.5. Ограничения

Redis не хранит:

- пользователей как источник истины;
- отчёты как единственную копию;
- файлы;
- финальные результаты анализа;
- платежи и биллинг.

Если Redis очищен, система должна продолжить работу, потеряв только кэш и активные временные данные очередей.
