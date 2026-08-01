# @reviewsha/web

Пользовательское React 19 + Vite приложение «Ревьюша».

## Назначение

Web отвечает за пользовательский интерфейс: dashboard, проекты, отчёты, чат и настройки. На Этапе 2 реализован только production-ready skeleton без бизнес-логики.

## Запуск

```bash
yarn workspace @reviewsha/web dev
```

## Проверки

```bash
yarn workspace @reviewsha/web lint
yarn workspace @reviewsha/web typecheck
yarn workspace @reviewsha/web test
yarn workspace @reviewsha/web build
```

## ENV

Пример:

```txt
apps/web/.env.example
```

```env
VITE_API_URL=http://localhost:3000/api/v1
```

## Роуты MVP skeleton

```txt
/login
/dashboard
/projects
/projects/:id
/reports/:id
/chat
/settings
*
```

## Зависимости

- React 19
- Vite
- React Router
- TanStack Query
- Zustand
- React Hook Form
- Zod
- `@reviewsha/sdk`
- `@reviewsha/ui`
- `@reviewsha/types`
- `@reviewsha/config`
