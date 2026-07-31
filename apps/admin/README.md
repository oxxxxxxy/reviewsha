# @reviewsha/admin

Административное React 19 + Vite приложение «Ревьюша».

## Назначение

Admin отвечает за будущие функции управления пользователями, проектами, очередями, AI, логами и настройками системы. На Этапе 2 реализован независимый skeleton без бизнес-логики.

## Запуск

```bash
yarn workspace @reviewsha/admin dev
```

## Проверки

```bash
yarn workspace @reviewsha/admin lint
yarn workspace @reviewsha/admin typecheck
yarn workspace @reviewsha/admin test
yarn workspace @reviewsha/admin build
```

## ENV

Пример:

```txt
apps/admin/.env.example
```

```env
VITE_API_URL=http://localhost:3000/api
```

## Роуты MVP skeleton

```txt
/login
/dashboard
/users
/projects
/queues
/ai
/logs
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
