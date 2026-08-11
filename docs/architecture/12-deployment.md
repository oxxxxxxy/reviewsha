# Deployment Architecture проекта "Ревьюша"

> **Historical architecture note.** This numbered design document predates the current canonical architecture index. Verify all claims against code.

## 1. Назначение документа

Этот документ описывает:

- окружения;
- контейнеризацию;
- CI/CD;
- Kubernetes инфраструктуру;
- Helm deployment;
- масштабирование сервисов.

---

# 2. Общая стратегия

Используются три окружения:

```
Development

↓

Staging

↓

Production
```

---

# 3. Development

Используется локально разработчиками.

Запуск:

```
docker compose up
```

---

Включает:

```
Frontend

Backend

Worker

PostgreSQL

Redis

MinIO
```

---

# 4. Production

Используется:

```
Kubernetes
```

Управление:

```
Helm
```

---

Сервисы:

```
web

api

worker

postgres

redis

minio
```

---

# 5. Общая схема инфраструктуры

```
                 Internet

                    |

                 Ingress

                    |

        -------------------------

        |                       |

     Frontend                 API

                                |

              -------------------------

              |           |           |

          PostgreSQL    Redis       MinIO


                                |

                              Worker

                                |

                              AI API
```

---

# 6. Docker архитектура

Каждое приложение имеет свой Dockerfile.

Структура:

```
apps/

├── web

│   └── Dockerfile

│

├── api

│   └── Dockerfile

│

└── worker

    └── Dockerfile
```

---

# 7. Frontend Container

Процесс:

```
Build React

↓

Static files

↓

Nginx
```

---

Docker:

```
Node

↓

Build

↓

Nginx
```

---

# 8. Backend Container

Запускает:

```
NestJS API
```

---

Команда:

```
npm run start:prod
```

---

Переменные:

```
DATABASE_URL

REDIS_URL

JWT_SECRET

MINIO_URL

AI_KEY
```

---

# 9. Worker Container

Запускает:

```
BullMQ Worker
```

---

Не имеет:

```
HTTP порт
```

---

Подключения:

```
Redis

Postgres

MinIO

AI Provider
```

---

# 10. Docker Compose

Файл:

```
docker-compose.yml
```

---

Сервисы:

```yaml
services:

 frontend:

 api:

 worker:

 postgres:

 redis:

 minio:
```

---

Используется для:

- локальной разработки;
- тестирования;
- быстрых проверок.

---

# 11. Kubernetes структура

```
k8s/

├── api/

├── web/

├── worker/

├── postgres/

├── redis/

└── minio/
```

---

# 12. Kubernetes Deployment

Каждое приложение имеет:

```
Deployment

Service

ConfigMap

Secret
```

---

Пример:

```
api-deployment.yaml
```

---

# 13. API Deployment

Количество реплик:

MVP:

```
2 replicas
```

---

Масштабирование:

по:

- CPU;
- памяти;
- нагрузке.

---

# 14. Worker Deployment

Worker масштабируется независимо.

Пример:

```
worker replicas:

1-10
```

---

Причина:

AI анализы могут создавать большую нагрузку.

---

# 15. Redis

Используется для:

- BullMQ;
- кеширования.

---

В production:

варианты:

```
Redis Cluster

или

Managed Redis
```

---

# 16. PostgreSQL

Основная база.

Production требования:

- persistent storage;
- backup;
- migrations.

---

Миграции:

```
Prisma migrate deploy
```

---

# 17. MinIO

Хранилище объектов.

Используется:

```
Persistent Volume
```

---

Хранит:

```
projects

reports

exports
```

---

# 18. Helm

Структура:

```
helm/

reviewsha/

├── Chart.yaml

├── values.yaml

└── templates/
```

---

Настройки:

```
replicas

resources

environment

secrets
```

---

# 19. GitLab CI/CD

Pipeline:

```
Push

↓

Tests

↓

Build

↓

Docker Image

↓

Deploy
```

---

# 20. CI этапы

## Test

Запуск:

```
Vitest

Playwright

Lint
```

---

## Build

Создание:

```
Docker images
```

---

## Deploy

Обновление Kubernetes:

```
helm upgrade
```

---

# 21. Registry

Docker образы хранятся:

```
GitLab Container Registry
```

---

Пример:

```
registry/project/api:v1
```

---

# 22. Secrets

Секреты НЕ хранятся в Git.

Используются:

```
Kubernetes Secrets
```

---

Примеры:

```
JWT_SECRET

DATABASE_PASSWORD

AI_API_KEY
```

---

# 23. Environment Variables

Пример:

```
NODE_ENV=production

DATABASE_URL=

REDIS_URL=

MINIO_ENDPOINT=
```

---

# 24. Monitoring

Будущее:

```
Prometheus

Grafana

Loki
```

---

Отслеживается:

- ошибки API;
- время запросов;
- состояние очередей;
- AI расходы.

---

# 25. Logging

Все сервисы пишут:

```
JSON logs
```

---

Централизация:

```
Loki

+

Grafana
```

---

# 26. Backup

PostgreSQL:

```
daily backup
```

---

MinIO:

```
snapshot/versioning
```

---

# 27. Масштабирование

Frontend:

```
CDN
```

---

API:

```
Horizontal Scaling
```

---

Worker:

```
Increase replicas
```

---

AI:

```
Queue throttling
```

---

# 28. Итоговая схема

```
                 GitLab

                    |

                 CI/CD

                    |

              Docker Registry

                    |

                Kubernetes

                    |

        ------------------------

        |          |           |

       API       Worker      Frontend

        |          |

     Postgres    Redis

                    |

                  MinIO
```

Главный принцип:

> Каждый компонент системы разворачивается независимо, масштабируется отдельно и обновляется через автоматизированный CI/CD pipeline.