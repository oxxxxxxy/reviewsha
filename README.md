# Ревьюша

AI SaaS platform for automated code review.

## Текущее состояние

- ✅ Этап 1: проектирование системы — завершён.
- ✅ Этап 2.1: Yarn Workspaces — завершён.
- ✅ Этап 2.2: создание приложений — завершён (`api`, `web`, `admin`, `worker`).
- ✅ Этап 2.3: shared packages — завершён (`config`, `types`, `sdk`, `ui`).

## Структура монорепозитория

```txt
apps/
├── api      # NestJS Backend API
├── web      # React пользовательское приложение
├── admin    # React административная панель
└── worker   # NestJS/BullMQ background worker

packages/
├── config   # общие константы, URL, env keys, очереди, validation helpers
├── types    # общие TypeScript-типы, interfaces, enums, utility types
├── sdk      # единый Axios SDK для Backend API
└── ui       # общий React UI Kit, hooks и theme tokens
```

## Требования

- Node.js 24+
- Yarn Classic 1.22.22

## Быстрый старт

```bash
yarn install
```

Для приложений, которые используют shared packages, сначала собери пакеты:

```bash
yarn build:packages
```

## Основные команды

```bash
yarn workspace:list

yarn dev

yarn lint
yarn typecheck
yarn test
yarn build

yarn format
yarn format:check --ignore-unknown
yarn clean
```

## Команды по группам

```bash
yarn build:packages
yarn build:apps

yarn lint:packages
yarn lint:apps

yarn typecheck:packages
yarn typecheck:apps

yarn test:packages
yarn test:apps
```

## Запуск отдельных приложений

```bash
yarn workspace @reviewsha/api dev
yarn workspace @reviewsha/web dev
yarn workspace @reviewsha/admin dev
yarn workspace @reviewsha/worker dev
```

## Shared packages

Все приложения подключают общий код через workspace-зависимости вида `@reviewsha/*`.

```bash
yarn workspace @reviewsha/config build
yarn workspace @reviewsha/types build
yarn workspace @reviewsha/sdk build
yarn workspace @reviewsha/ui build
```

Правило проекта: общий код не копируется между приложениями. Общие типы, UI, SDK и конфигурация добавляются только в `packages/*`.

## CI

GitHub Actions workflow находится в `.github/workflows/ci.yml` и выполняет:

1. `yarn install --frozen-lockfile`
2. `yarn format:check --ignore-unknown`
3. `yarn lint`
4. `yarn typecheck`
5. `yarn test`
6. `yarn build`

## Документация

- `docs/PRD.md` — продуктовые требования.
- `docs/architecture/*` — архитектура системы.
- `docs/implementation/stage-2.md` — статус реализации Этапа 2.
- `docs/implementation/stage-2-2-definition-of-done.md` — DoD по созданию приложений.
- `docs/implementation/stage-2-3-shared-packages.md` — DoD по shared packages.
