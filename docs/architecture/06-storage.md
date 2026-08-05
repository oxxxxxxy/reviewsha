# Архитектура хранения файлов проекта "Ревьюша"

## 1. Назначение документа

Этот документ описывает систему хранения файлов:

- объектное хранилище;
- структуру данных;
- загрузку файлов;
- жизненный цикл файлов;
- безопасность доступа;
- взаимодействие с PostgreSQL.

Основное хранилище:

```
MinIO
```

API использует `StorageService` из `StorageModule`; MinIO SDK инкапсулирован в
`MinioProvider`. Upload Module не импортирует SDK напрямую.

Загрузка проекта хранится в bucket `projects` по ключу:

```text
users/{userId}/projects/{projectId}/uploads/{uploadId}.zip
```

Метаданные загрузки и версия хранятся в PostgreSQL (`uploaded_files`), содержимое —
в MinIO. Принимаются только ZIP до 100 MB с защитой от path traversal и zip bomb.
HTTP upload использует временный файл и потоковую передачу в MinIO; архив не
удерживается целиком в памяти приложения. Временный файл удаляется после
завершения или ошибки pipeline.

---

# 2. Общая концепция хранения

Система разделяет:

## Метаданные

Хранятся в:

```
PostgreSQL
```

Примеры:

- имя файла;
- размер;
- владелец;
- проект;
- дата загрузки;
- статус.

---

## Содержимое файлов

Хранятся в:

```
MinIO
```

Примеры:

- ZIP архив проекта;
- исходный код;
- промежуточные файлы;
- отчёты;
- экспорт.

---

Общая схема:

```
                PostgreSQL

                  File

                   |

              storagePath

                   |

                   ↓


                  MinIO

              actual object
```

---

# 3. Почему MinIO

MinIO выбран как объектное хранилище вместо хранения файлов:

- в PostgreSQL;
- на локальном диске сервера.

Причины:

- S3-compatible API;
- масштабируемость;
- удобная работа с большими файлами;
- возможность переноса в AWS S3;
- разделение данных и файлов.

---

# 4. Bucket структура

Используется несколько bucket.

Структура:

```
minio/

├── projects
│
├── reports
│
├── temp
│
└── exports
```

---

# 5. Projects bucket

Назначение:

Исходные файлы пользователей.

Структура:

```
projects/

    user-id/

        project-id/

            scan-id/

                source.zip
```

Пример:

```
projects/

123/

456/

789/

source.zip
```

---

Используется для:

- загруженных архивов;
- исходного кода;
- версий проекта.

---

# 6. Reports bucket

Назначение:

Готовые отчёты.

Структура:

```
reports/

    project-id/

        scan-id/

            report.pdf

            report.md

            report.json
```

---

# 7. Temp bucket

Временные данные.

Используется Worker.

Пример:

```
temp/

    scan-id/

        extracted/

        chunks/

        analysis/
```

---

Жизненный цикл:

```
Создание

↓

Использование Worker

↓

Удаление после завершения
```

---

# 8. Exports bucket

Для пользовательских экспортов.

Пример:

```
exports/

    user-id/

        export.zip

        report.md
```

---

# 9. Связь с PostgreSQL

Таблица File:

```
File

id

projectId

filename

storagePath

mimeType

size

hash

createdAt
```

---

Пример записи:

```json
{
"id": "file123",
"filename": "project.zip",
"storagePath": "projects/1/5/10/source.zip",
"size": 52428800
}
```

---

# 10. Жизненный цикл файла

## Этап 1. Загрузка

Пользователь:

```
React

↓

API
```

---

API:

1. Проверяет пользователя.
2. Проверяет проект.
3. Проверяет файл.
4. Создаёт запись File.
5. Загружает объект в MinIO.

---

Схема:

```
User

↓

API

↓

MinIO

↓

PostgreSQL
```

---

# Этап 2. Анализ

Worker получает:

```
fileId
```

---

Worker:

1. Получает путь из PostgreSQL.
2. Загружает файл из MinIO.
3. Обрабатывает.
4. Создаёт результаты.

---

Схема:

```
Worker

↓

PostgreSQL

↓

storagePath

↓

MinIO
```

---

# Этап 3. Удаление

Удаление проекта:

```
Project deleted

↓

Удаление связанных File

↓

Удаление объектов MinIO
```

---

# 11. Загрузка файлов

## Ограничения MVP

Разрешено:

```
.zip
```

---

Проверки:

- размер;
- расширение;
- MIME type;
- количество файлов;
- безопасность архива.

---

# 12. Безопасность файлов

## Проверка доступа

Перед любой операцией:

```
Request

↓

JWT

↓

Permission

↓

Project Access

↓

MinIO
```

---

Пользователь не получает прямой доступ к объектам.

---

# 13. Presigned URLs

Для больших файлов используются временные ссылки.

Например:

```
API

↓

Создание URL

↓

MinIO

↓

Frontend получает файл
```

---

Срок жизни ссылки:

например:

```
15 минут
```

---

# 14. Защита от вредоносных файлов

Перед анализом:

Проверяется:

- размер архива;
- глубина вложенности;
- количество файлов;
- подозрительные расширения.

---

Примеры блокировок:

```
.exe

.sh

.bat

слишком большой архив
```

---

# 15. Hashирование файлов

Каждый файл получает hash.

Используется:

```
SHA-256
```

Для:

- проверки целостности;
- поиска дубликатов;
- оптимизации повторных анализов.

---

# 16. Кэширование

Redis может хранить:

```
fileId → metadata
```

Но источник истины:

```
PostgreSQL
```

---

# 17. Взаимодействие с другими модулями

## ProjectsModule

Создаёт связь:

```
Project → File
```

---

## ScanModule

Использует:

```
File → Scan
```

---

## Worker

Использует:

```
FileService

↓

MinIO
```

---

# 18. Будущие расширения

Архитектура позволяет добавить:

- Git репозитории;
- прямую загрузку через S3;
- хранение отдельных версий файлов;
- диффы между анализами;
- CDN;
- шифрование объектов.

---

# 19. Итоговая схема

```
             User

              |

          React Web

              |

             API

              |

       ----------------

       |              |

 PostgreSQL        MinIO

 metadata          files

                       |

                    Worker

                       |

                  AI Pipeline
```

Главный принцип:

> PostgreSQL хранит информацию о файлах, MinIO хранит сами файлы. Ни один пользователь не получает доступ к объектам без проверки прав.

# 20. Storage responsibility matrix

Этот раздел фиксирует, что именно хранится в PostgreSQL, Redis и MinIO.

---

## 20.1. PostgreSQL

PostgreSQL хранит только метаданные и бизнес-сущности:

```txt
User
Session metadata
Project
ProjectMember
File metadata
Scan
ScanStep
Issue
Report metadata
AIRequest metadata/cost
Chat
Message
Notification
Organization
Invitation
```

Для файлов хранится:

```txt
id
projectId
uploadedById
bucket
objectKey
originalName
mimeType
size
sha256
status
createdAt
deletedAt
```

---

## 20.2. Redis

Redis хранит временные данные:

```txt
BullMQ queues/jobs
scan progress cache
short-lived status cache
session cache
rate limiting counters
distributed locks
idempotency keys
AI response cache by prompt hash
```

Redis не является источником истины.

---

## 20.3. MinIO

MinIO хранит бинарные объекты:

```txt
source ZIP archives
extracted snapshots if needed
report PDFs
report Markdown files
report JSON exports
avatars
temporary exports
```

Bucket layout:

```txt
projects/{userId}/{projectId}/uploads/{fileId}.zip
projects/{userId}/{projectId}/snapshots/{scanId}/...
reports/{projectId}/{scanId}/report.md
reports/{projectId}/{scanId}/report.pdf
reports/{projectId}/{scanId}/report.json
exports/{userId}/{exportId}/{filename}
temp/{jobId}/...
avatars/{userId}/{fileId}
```

---

## 20.4. Ownership

```txt
PostgreSQL decides who owns data.
MinIO stores bytes.
Redis accelerates temporary operations.
API enforces access.
Worker processes files.
```
