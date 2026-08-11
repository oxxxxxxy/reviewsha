# `@reviewsha/admin`

Административное React 19 + Vite приложение для users, projects, queues, logs,
AI usage и statistics.

## Запуск и env

```bash
cp apps/admin/.env.example apps/admin/.env
yarn workspace @reviewsha/admin dev
```

`VITE_API_URL` по умолчанию: `http://localhost:3000/api/v1`.

## Проверки

```bash
yarn workspace @reviewsha/admin lint
yarn workspace @reviewsha/admin typecheck
yarn workspace @reviewsha/admin test
yarn workspace @reviewsha/admin build
```

Frontend guard не является security boundary: каждый `/admin` endpoint проверяет
JWT и role на backend. См. [admin guide](../../docs/frontend/admin.md).
