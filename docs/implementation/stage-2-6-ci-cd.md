# Этап 2.6. CI/CD — GitHub Actions

Статус: ✅ COMPLETE

## Цель

Подготовить автоматическую проверку качества проекта при каждом `push`, `pull_request` и ручном запуске через `workflow_dispatch`.

Так как репозиторий находится на GitHub, основная CI-система — GitHub Actions. Логика пайплайна спроектирована так, чтобы позже её можно было перенести в GitLab CI без изменения последовательности стадий.

## Workflows

```txt
.github/workflows/
├── ci.yml
└── release.yml
```

## CI triggers

`ci.yml` запускается при:

- push в `main`;
- push в `dev`;
- pull request в `main` или `dev`;
- ручном запуске `workflow_dispatch`;
- nightly schedule `0 2 * * *`.

## Branch strategy

Постоянные ветки:

```txt
main — стабильная ветка;
dev  — интеграционная ветка разработки.
```

Ожидаемый поток изменений:

```txt
feature/* → dev → main
```

## Runtime

Используется matrix-ready конфигурация:

```yaml
node-version:
  - 24.x
```

Node.js 24 — текущая LTS-линейка для проекта. Матрицу можно расширить дополнительными версиями Node.js без изменения структуры jobs.

## Pipeline stages

Текущая логика CI разбита на параллельные jobs:

```txt
quality        → lint + typecheck + format check
build          → build + TypeDoc + artifacts
unit-tests     → package/app unit tests
smoke-tests    → Stage 2 smoke/integration checks
prisma-tests   → Stage 3 Prisma migration/seed checks
e2e-tests      → Playwright browser tests
docker-config  → docker compose config + future security placeholders
ci-result      → aggregate gate
```

Такой layout уменьшает wall-clock время CI: независимые проверки стартуют параллельно, а `ci-result` только агрегирует результат.

Команды:

```bash
yarn install --immutable --non-interactive
yarn lint
yarn typecheck
yarn format:check --ignore-unknown
yarn ci:quality
yarn ci:build
yarn ci:unit
yarn ci:smoke
yarn ci:prisma
yarn ci:e2e
yarn ci:docker
```

## Кэширование

Используется официальный cache mechanism `actions/setup-node`:

```yaml
cache: yarn
cache-dependency-path: yarn.lock
```

## Docker checks

На текущем этапе включена проверка конфигурации:

```bash
docker compose config
```

Сборка Docker images подготовлена placeholder step и будет включена после добавления Dockerfile для приложений.

## Security checks

Подготовлены отключённые placeholder steps для:

- dependency audit;
- license checks;
- secret scanning.

Они намеренно отключены до выбора конкретной политики и инструментов.

## Artifacts

После успешного build загружаются build artifacts:

```txt
apps/api/dist
apps/worker/dist
apps/web/dist
apps/admin/dist
packages/*/dist
```

Retention:

```txt
7 days
```

## Release workflow

`release.yml` — ручная заготовка будущего release pipeline.

Сейчас он не публикует артефакты и только фиксирует будущую точку расширения для packaging, changelog и deployment.

## Подготовка к GitLab CI

Логические стадии совместимы с будущим GitLab CI:

```txt
Install
Lint
Typecheck
Build
Test
Docker
Deploy
```

При переносе понадобится адаптировать только синтаксис `.gitlab-ci.yml`, не меняя процесс проверок.

## Definition of Done

- ✅ создан `.github/workflows/ci.yml`;
- ✅ workflow запускается при push в `main`/`dev`, pull request, workflow_dispatch и nightly schedule;
- ✅ используется Node.js LTS;
- ✅ включён Corepack;
- ✅ используется Yarn Classic 1.22.22;
- ✅ зависимости устанавливаются через `yarn install --immutable --non-interactive`;
- ✅ включено кэширование Yarn dependencies;
- ✅ автоматически выполняются lint, typecheck, format check, build, docs, unit, smoke, Prisma и E2E tests;
- ✅ выполняется `docker compose config`;
- ✅ подготовлены placeholder steps для Docker image build и security checks;
- ✅ build artifacts публикуются через `actions/upload-artifact`;
- ✅ добавлен release workflow placeholder;
- ✅ README обновлён;
- ✅ CI process готов к будущему переносу в GitLab CI.
