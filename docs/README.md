# Reviewsha documentation

Документация является частью репозитория и обновляется вместе с кодом. Источник
истины — текущие NestJS/React/Prisma/BullMQ/OpenAPI реализации; старые
implementation notes используются как история работ, а не как спецификация.

## С чего начать

- [Установка и Quick Start](getting-started/installation.md)
- [Конфигурация и переменные окружения](getting-started/configuration.md)
- [Первый запуск и smoke-check](getting-started/first-run.md)

## Разработка

- [Обзор архитектуры](architecture/overview.md)
- [Структура monorepo](architecture/project-structure.md)
- [Локальная разработка](development/local-development.md)
- [База данных и Prisma](development/database.md)
- [Очереди и BullMQ](development/queues.md)
- [Storage и MinIO](development/storage.md)
- [Тестирование](development/testing.md)
- [Workflow и contribution](development/workflow.md)

## Архитектура и backend

- [Backend modules и API boundaries](architecture/backend.md)
- [Authentication и authorization](backend/authentication.md)
- [Worker](architecture/worker.md)
- [AI pipeline](architecture/ai-pipeline.md)
- [Chat](backend/chat.md)
- [GitHub project sources](backend/github-sources.md)
- [API/OpenAPI](api/openapi.md)

## Frontend

- [Web application](frontend/web.md)
- [Admin application](frontend/admin.md)
- [SDK и UI Kit](frontend/sdk-and-ui.md)

## Deployment

- [Deployment overview](deployment/overview.md)
- [Docker](deployment/docker.md)
- [Kubernetes](deployment/kubernetes.md)
- [Helm](deployment/helm.md)
- [Production procedure](deployment/production.md)
- [Rollback](deployment/rollback.md)
- [Troubleshooting](deployment/troubleshooting.md)
- [Production checklist](deployment/checklist.md)

## Контракты и сопровождение

- [CONTRIBUTING.md](../CONTRIBUTING.md)
- [API contract](api/openapi.md)
- [Архитектурный индекс](architecture/README.md)
- [Архитектурные решения](architecture/adr/README.md)
- [Documentation inventory](documentation-inventory.md)
- [Manual UX audit 2026-08-11](qa/manual-ux-audit-2026-08-11.md)
- [Implementation notes index](implementation/README.md)
- [Implementation audit 11–14](implementation/stages-11-14-completion-audit.md)

## Правило обновления

При изменении endpoint, env-переменной, queue payload, Prisma schema, Docker/Helm
values или пользовательского flow обновляйте соответствующий документ в том же
pull request. Проверяйте ссылки командой `yarn docs:check`.
