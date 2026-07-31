# Этап 2. Создание монорепозитория

Цель этапа: получить пустой, но полностью рабочий production skeleton проекта.

---

## 2.1. Инициализация Yarn Workspaces

Статус: ✅ COMPLETE

Создано:

```txt
package.json
yarn.lock
.yarnrc
.editorconfig
.gitignore
.prettierignore
README.md
tsconfig.base.json
eslint.config.mjs
.prettierrc.json
```

Workspace layout:

```txt
apps/
├── api
├── web
├── admin
└── worker

packages/
├── ui
├── sdk
├── types
└── config
```

Root scripts:

```bash
yarn dev
yarn build
yarn lint
yarn typecheck
yarn test
yarn format
yarn format:check
yarn clean
yarn workspace:list
```

Root dev dependencies:

```txt
typescript
eslint
prettier
```

Проверено:

```bash
yarn workspaces info
yarn dev
```

Оба вызова успешно выполняются.

---

## 2.2. Создание приложений

Статус: 🟡 IN PROGRESS

Нужно создать реальные scaffold-приложения:

```txt
apps/api      NestJS 11
apps/web      React 19 + Vite
apps/admin    React 19 + Vite
apps/worker   Node/Nest worker + BullMQ bootstrap
```

---

### 2.2.1 Backend API

Статус: ✅ COMPLETE

Создан NestJS 11 skeleton:

```txt
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   └── http-exception.filter.ts
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── config.module.ts
│   │   └── env.schema.ts
│   ├── database/
│   │   ├── database.module.ts
│   │   └── prisma.service.ts
│   ├── modules/
│   └── health/
│       ├── health.controller.ts
│       ├── health.module.ts
│       └── health.service.ts
├── prisma/
│   └── schema.prisma
├── prisma.config.ts
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── .env.example
└── package.json
```

Включено:

- NestJS 11;
- env config через `@nestjs/config` + Zod validation;
- Prisma 7 client подготовлен через `@prisma/adapter-pg`;
- Swagger UI на `/api/docs`;
- OpenAPI JSON на `/api/docs-json`;
- global API prefix `/api`;
- CORS;
- ValidationPipe;
- общий exception filter;
- health endpoint `/api/health`.

Проверено:

```bash
yarn workspace @reviewsha/api prisma:generate
yarn workspace @reviewsha/api typecheck
yarn workspace @reviewsha/api build
yarn workspace @reviewsha/api lint
yarn workspace @reviewsha/api dev
curl http://localhost:3000/api/health
```

Ответ:

```json
{
  "status": "ok"
}
```

---

### 2.2.2 Frontend Web

Статус: ✅ COMPLETE

Создан React 19 + Vite skeleton пользовательского приложения:

```txt
apps/web/
├── public/
├── src/
│   ├── app/
│   │   ├── app.tsx
│   │   ├── main.tsx
│   │   ├── providers.tsx
│   │   └── router.tsx
│   ├── api/
│   │   ├── client.ts
│   │   └── index.ts
│   ├── assets/
│   ├── components/
│   │   ├── shared/
│   │   └── ui/
│   ├── features/
│   ├── hooks/
│   ├── layouts/
│   │   ├── AppLayout.tsx
│   │   └── AuthLayout.tsx
│   ├── pages/
│   │   ├── Chat/
│   │   ├── Dashboard/
│   │   ├── Login/
│   │   ├── NotFound/
│   │   ├── Projects/
│   │   ├── Reports/
│   │   └── Settings/
│   ├── stores/
│   │   └── ui.store.ts
│   ├── styles/
│   │   ├── global.css
│   │   └── variables.css
│   ├── types/
│   └── utils/
├── .env.example
├── index.html
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── package.json
```

Подключено:

- React 19;
- Vite;
- TypeScript;
- React Router;
- TanStack Query;
- Zustand;
- React Hook Form;
- Zod;
- Axios;
- `@hookform/resolvers`.

Реализовано:

- app bootstrap через `src/app/main.tsx`;
- `AppProviders` с `QueryClientProvider` и `BrowserRouter`;
- `QueryClient` с `retry`, `staleTime`, `refetchOnWindowFocus`;
- маршруты MVP;
- `AppLayout`;
- `AuthLayout`;
- placeholder страницы;
- login form example через React Hook Form + Zod;
- axios client с `baseURL`, `timeout`, JSON headers и interceptor-заглушками;
- Zustand `ui.store.ts`;
- глобальные стили и CSS variables;
- `.env.example` с `VITE_API_URL`.

Маршруты MVP:

```txt
/
/login
/dashboard
/projects
/projects/:id
/reports/:id
/chat
/settings
*
```

Проверено:

```bash
yarn workspace @reviewsha/web dev
yarn workspace @reviewsha/web build
yarn workspace @reviewsha/web typecheck
yarn workspace @reviewsha/web lint
yarn build
yarn typecheck
yarn format:check --ignore-unknown
```

Dev routes возвращают `200`:

```txt
/
/login
/dashboard
/projects
/projects/123
/reports/abc
/chat
/settings
/unknown
```

---

### 2.2.3 Admin

Статус: ⏳ NEXT

```txt
apps/admin
React 19 + Vite admin application skeleton
```
