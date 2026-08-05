# Архитектура Worker проекта "Ревьюша"

Worker подключается к тем же Redis и именам BullMQ очередей, что и API. Stage 7.1
фиксирует инфраструктуру и retry policy. Stage 7.2 создаёт jobs цепочки
`extract → parse → analyze → merge → report → notify`. Stage 8.1 добавляет
standalone Nest application context, BullMQ consumers, typed processor registry,
database/storage adapters, isolated temporary workspaces и graceful shutdown.
Реальные Download/Extract/Parse/Merge/Cleanup операции выполняются на Stage 8.2.

## Stage 8.2 Processing Jobs

File queue использует отдельные обработчики `download`, `extract`, `parse`,
`merge` и `cleanup`. `DownloadProcessor` читает объект через
`WorkerStorageService`, проверяет размер и SHA-256 из `UploadedFile` и сохраняет
архив в workspace. `ArchiveService` распаковывает ZIP потоково и блокирует Zip
Slip, превышение количества файлов, глубины и распакованного размера.

`ParserService` индексирует файлы без `.git`, `node_modules`, `dist`, `build` и
`.env`, определяет MVP-языки и сохраняет размеры, строки и SHA-256. Затем
`MergeProcessor` формирует `context.json`, а `CleanupProcessor` идемпотентно
удаляет `/tmp/reviewsha/jobs/{pipelineId}`. Payload очереди содержит только
идентификаторы; бинарные данные остаются в MinIO и workspace.

После подготовки контекста Worker использует AI layer (`parser → chunks →
context → prompts`) и provider abstraction для OmniRouter. Ответы проходят
JSON validation и reporting layer (aggregation, deduplication, score, Markdown
и JSON builders).

Для обратной совместимости с Stage 7 исторический `extract` job расширяется на
границе `FileWorker`: сначала выполняется зарегистрированный `DownloadProcessor`,
затем `ExtractProcessor`. Поэтому фактический runtime flow остаётся
`Download → Extract → Parse → Merge → Cleanup`, а изменение API queue contract
не требуется. После cleanup создаётся AI `analyze` job.

## Stage 8.1 Worker Infrastructure

`apps/worker/src/main.ts` запускает `NestFactory.createApplicationContext` без
HTTP-сервера и Controllers. `WorkerModule` регистрирует queue consumers,
`WorkerDatabaseService`, `WorkerStorageService`, `WorkerHealthService`,
`FilesystemService`, `TempStorageService`, `CleanupService` и
`ProcessorRegistry`. Каждый job workspace изолирован в
`/tmp/reviewsha/jobs/{jobId}/{source,extracted,output}`.

Worker использует Redis/BullMQ, PostgreSQL через Prisma adapter-pg и MinIO через
собственный adapter. `QueueService.healthCheck()` проверяет Redis и counts
очередей, а `WorkerHealthService.check()` агрегирует Redis, database и storage.
SIGINT/SIGTERM закрывают workers, queues, Redis и Prisma connections.

Docker image собирается из `apps/worker/Dockerfile`; Compose service `worker`
подключается к `postgres`, `redis` и `minio`.

## 1. Назначение документа

Этот документ описывает архитектуру фонового приложения Worker:

- структуру приложения;
- обработчики очередей;
- pipeline обработки проекта;
- взаимодействие с MinIO;
- взаимодействие с AI;
- обновление прогресса;
- обработку ошибок.

Worker расположен в:

```
apps/worker
```

---

# 2. Роль Worker

Worker отвечает за выполнение тяжёлых операций.

Он выполняет:

- обработку архивов;
- анализ структуры проекта;
- чтение исходного кода;
- подготовку контекста;
- отправку запросов в AI;
- сбор результатов;
- генерацию отчётов.

---

Worker НЕ выполняет:

- HTTP запросы пользователей;
- авторизацию;
- управление пользователями;
- бизнес-операции напрямую.

---

# 3. Общая схема

```
                 Redis

                  |

              BullMQ Queue

                  |

                Worker

                  |

      ----------------------------

      |            |             |

   Files        AI          Reports

      |            |             |

      ----------------------------

                  |

          PostgreSQL + MinIO
```

---

# 4. Структура приложения

```
apps/worker/src/

├── main.ts
├── worker.module.ts
│
├── processors/
│
│   ├── scan.processor.ts
│   ├── file.processor.ts
│   ├── ai.processor.ts
│   ├── report.processor.ts
│   └── notification.processor.ts
│
├── services/
│
│   ├── storage.service.ts
│   ├── parser.service.ts
│   ├── analyzer.service.ts
│   ├── report.service.ts
│   └── progress.service.ts
│
├── ai/
│
│   ├── providers/
│   ├── prompts/
│   └── schemas/
│
└── common/
```

---

# 5. Worker Module

Главный модуль приложения.

Подключает:

```
BullMQ

Prisma

MinIO Client

AI Providers
```

---

# 6. Processors

Processor — обработчик конкретного типа Job.

Каждый processor:

- получает задачу;
- выполняет операцию;
- обновляет состояние;
- создаёт следующие задачи.

---

# 7. Scan Processor

Главный координатор анализа.

Queue:

```
scan
```

Processor:

```
ScanProcessor
```

---

Получает:

```json
{
 "scanId": "123",
 "projectId": "456"
}
```

---

Запускает:

```
1. Проверка проекта

2. Подготовка файлов

3. Создание AI задач

4. Ожидание результатов

5. Создание отчёта
```

---

# 8. File Processor

Работа с файлами.

Queue:

```
file
```

---

Задачи:

## ExtractArchive

Получает:

```
source.zip
```

Процесс:

```
MinIO

↓

Download

↓

Extract

↓

Temporary Storage

↓

Parse
```

---

## ValidateProject

Проверяет:

```
package.json

requirements.txt

pom.xml

go.mod
```

Определяет:

- язык;
- фреймворк;
- структуру проекта.

---

# 9. Parser Service

Отвечает за анализ структуры проекта.

Задачи:

- поиск файлов;
- определение языков;
- построение дерева проекта.

Пример:

```
project/

├── src/

│   ├── main.ts

│   ├── auth.ts

│

├── package.json
```

---

Результат:

```json
{
 "language": "typescript",
 "framework": "nestjs",
 "files": 120
}
```

---

# 10. Code Analyzer

Основной сервис анализа.

Отвечает за:

- подготовку файлов;
- разбиение кода;
- создание AI задач.

---

Процесс:

```
File

↓

Read Content

↓

Split Into Chunks

↓

Create AI Jobs
```

---

# 11. Chunking

Большие файлы нельзя отправлять целиком.

Используется разбиение.

Например:

```
service.ts

5000 строк

↓

chunk 1

chunk 2

chunk 3
```

---

Каждый chunk содержит:

```
fileId

language

content

context
```

---

# 12. AI Processor

Queue:

```
ai
```

---

Задача:

```
AnalyzeCodeJob
```

---

Процесс:

```
Code Chunk

↓

Prompt Builder

↓

AI Provider

↓

Response Parser

↓

Save Issue
```

---

# 13. Работа с AI

Worker использует абстракцию:

```
AIProvider
```

---

Интерфейс:

```
analyzeCode()

generateFix()

chat()
```

---

Позволяет менять:

```
DeepSeek

↓

Claude

↓

Local LLM
```

без изменения pipeline.

---

# 14. Report Processor

Queue:

```
report
```

---

Создаёт:

```
report.md

report.pdf

report.json
```

---

Процесс:

```
Issues

↓

Aggregation

↓

Formatting

↓

Export

↓

Upload MinIO
```

---

# 15. Progress Tracking

Пользователь должен видеть:

```
Анализ:

██████░░░░ 60%
```

---

Прогресс хранится:

PostgreSQL:

```
ScanStep
```

---

Обновляется после каждого этапа:

```
UPLOAD

↓

EXTRACT

↓

ANALYZE

↓

REPORT
```

---

# 16. Взаимодействие с PostgreSQL

Worker использует Prisma.

Записывает:

- Scan status;
- ScanStep;
- Issues;
- Report;
- AIRequest.

---

Пример:

```
AI завершился

↓

Создать Issue

↓

Обновить ScanProgress
```

---

# 17. Временное хранилище

Worker использует временную директорию:

```
temp/

scan-id/
```

Пример:

```
temp/

123/

├── extracted/

├── chunks/

└── results/
```

---

После завершения:

```
cleanup()
```

---

# 18. Ошибки

Ошибки разделяются:

## Recoverable

Повторяем:

- AI timeout;
- сеть;
- Redis.

---

## Fatal

Останавливаем:

- повреждённый архив;
- неизвестный формат.

---

При ошибке:

```
Job failed

↓

Update Scan

↓

Notify User
```

---

# 19. Параллельность

Worker поддерживает несколько задач одновременно.

Например:

```
Worker #1

Scan A


Worker #2

Scan B
```

---

AI задачи ограничиваются отдельно:

```
AI concurrency = 5
```

---

# 20. Безопасность

Worker работает в изолированном окружении.

Запрещено:

- выполнять код пользователя;
- запускать неизвестные бинарники;
- использовать доступ к системе.

---

Для анализа используются:

- статический анализ;
- чтение файлов;
- AI review.

---

# 21. Будущие расширения

Можно добавить:

- Docker sandbox для запуска тестов;
- Git diff анализ;
- автоматическое исправление кода;
- генерацию Pull Request;
- локальные модели.

---

# 22. Итоговая схема

```
              BullMQ

                 |

              Worker

                 |

      ---------------------

      |          |         |

    Files       AI      Reports

      |          |         |

      ---------------------

                 |

          PostgreSQL

                 |

              MinIO
```

Главный принцип:

> Worker является вычислительным ядром системы: он выполняет тяжёлую обработку, но не содержит пользовательского интерфейса и не принимает HTTP-запросы.
