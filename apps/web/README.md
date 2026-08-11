# `@reviewsha/web`

Пользовательское React 19 + Vite приложение: auth, dashboard, projects, upload,
analysis, reports, chat и settings.

## Запуск и env

```bash
cp apps/web/.env.example apps/web/.env
yarn workspace @reviewsha/web dev
```

`VITE_API_URL` по умолчанию: `http://localhost:3000/api/v1`.

## Проверки

```bash
yarn workspace @reviewsha/web lint
yarn workspace @reviewsha/web typecheck
yarn workspace @reviewsha/web test
yarn workspace @reviewsha/web build
```

Web использует `@reviewsha/sdk` для REST и typed streaming client для Chat, а
общие primitives берёт из `@reviewsha/ui`. См. [frontend guide](../../docs/frontend/web.md).
