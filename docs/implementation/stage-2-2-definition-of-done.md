# Definition of Done — Этап 2.2. Создание приложений

Этап 2.2 считается завершённым только если все приложения монорепозитория созданы, запускаются независимо, соответствуют PRD, архитектуре `docs/architecture/*` и общим принципам проекта.

---

## 1. Структура монорепозитория

### Workspace

- ✅ Созданы приложения:
  - `apps/api`
  - `apps/web`
  - `apps/admin`
  - `apps/worker`
- ✅ Все приложения зарегистрированы в Yarn Workspaces.
- ✅ Все приложения имеют собственный `package.json`.
- ✅ Все приложения наследуют общий `tsconfig.base.json`.
- ✅ Все приложения используют общие правила ESLint и Prettier.
- ✅ Все приложения собираются независимо друг от друга.

Проверка:

```bash
yarn workspace:list
yarn workspace @reviewsha/api build
yarn workspace @reviewsha/web build
yarn workspace @reviewsha/admin build
yarn workspace @reviewsha/worker build
```

---

## 2. Backend API

### Приложение

- ✅ Используется NestJS 11.
- ✅ Backend запускается отдельно от остальных сервисов.
- ✅ Приложение успешно проходит сборку.
- ✅ Работает режим разработки.
- ✅ Реализован bootstrap приложения.

### Конфигурация

- ✅ Используется `@nestjs/config`.
- ✅ Все переменные окружения валидируются через Zod.
- ✅ Нет прямого использования `process.env` вне конфигурационного слоя Backend API.

### API

- ✅ Используется глобальный префикс `/api`.
- ✅ Включён Swagger UI.
- ✅ Генерируется OpenAPI JSON.
- ✅ Настроен ValidationPipe.
- ✅ Настроен единый Exception Filter.
- ✅ Включён CORS.

### Database

- ✅ Подключён Prisma.
- ✅ Подготовлена структура Prisma.
- ✅ Создан Database Module.

### Health

- ✅ Реализован `/api/health`.
- ✅ Endpoint возвращает корректный статус приложения.

Проверка:

```bash
yarn workspace @reviewsha/api dev
curl http://localhost:3000/api/health
```

Ожидаемый ответ:

```json
{"status":"ok"}
```

---

## 3. Frontend Web

### Приложение

- ✅ Используется React 19.
- ✅ Используется Vite.
- ✅ Используется TypeScript.
- ✅ Приложение запускается независимо.

### Router

- ✅ Настроен React Router.
- ✅ Все маршруты существуют.
- ✅ Работает обработчик 404.

### Providers

- ✅ BrowserRouter подключён.
- ✅ QueryClientProvider подключён.
- ✅ Подготовлена регистрация глобальных Provider.

### State

- ✅ Подключён Zustand.
- ✅ Создан первый Store.

### API

- ✅ Создан Axios Client.
- ✅ Настроен базовый API Layer.

### Forms

- ✅ Подключены React Hook Form.
- ✅ Подключён Zod.

### Layout

- ✅ Создан AppLayout.
- ✅ Создан AuthLayout.

Проверка:

```bash
yarn workspace @reviewsha/web dev
yarn workspace @reviewsha/web build
yarn workspace @reviewsha/web typecheck
yarn workspace @reviewsha/web lint
yarn workspace @reviewsha/web test
```

---

## 4. Admin

### Приложение

- ✅ Создано как отдельное приложение.
- ✅ Не зависит от `apps/web`.
- ✅ Использует собственный Router.

### Технологии

- ✅ React 19.
- ✅ Vite.
- ✅ TypeScript.
- ✅ React Router.
- ✅ TanStack Query.
- ✅ Zustand.
- ✅ Axios.
- ✅ React Hook Form.
- ✅ Zod.

### Layout

- ✅ AdminLayout.
- ✅ AuthLayout.

### Страницы

- ✅ Dashboard.
- ✅ Users.
- ✅ Projects.
- ✅ Queues.
- ✅ AI.
- ✅ Logs.
- ✅ Settings.
- ✅ Login.
- ✅ NotFound.

Проверка:

```bash
yarn workspace @reviewsha/admin dev
yarn workspace @reviewsha/admin build
yarn workspace @reviewsha/admin typecheck
yarn workspace @reviewsha/admin lint
yarn workspace @reviewsha/admin test
```

---

## 5. Worker

### Приложение

- ✅ Используется NestJS 11.
- ✅ Worker запускается отдельно.
- ✅ Worker не поднимает HTTP Server.

### Redis

- ✅ Устанавливается соединение.
- ✅ Соединение корректно закрывается.

### BullMQ

- ✅ Зарегистрированы очереди:
  - `upload`
  - `extract`
  - `parse`
  - `analyze`
  - `report`
  - `cleanup`

### Workers

- ✅ Созданы отдельные Worker-классы.
- ✅ Worker корректно регистрируется.
- ✅ Реализован graceful shutdown.

Проверка:

```bash
yarn workspace @reviewsha/worker dev
yarn workspace @reviewsha/worker build
yarn workspace @reviewsha/worker typecheck
yarn workspace @reviewsha/worker lint
yarn workspace @reviewsha/worker test
```

---

## 6. Общая архитектура

- ✅ Все приложения соответствуют документации `docs/architecture`.
- ✅ Структура каталогов совпадает с архитектурными документами.
- ✅ Нет нарушений слоёв архитектуры.
- ✅ Нет циклических зависимостей между приложениями.
- ✅ Общий код не дублируется между приложениями сверх допустимого skeleton-уровня.
- ✅ Общие сущности должны выноситься только в `packages` на этапе 2.3 и далее.

---

## 7. Shared Packages

На этапе 2.2 shared packages подготовлены как точки интеграции, полноценное наполнение выполняется на этапе 2.3.

- ✅ Подготовлены пакеты:
  - `packages/ui`
  - `packages/sdk`
  - `packages/types`
  - `packages/config`
- ✅ Приложения готовы к использованию shared packages через Yarn Workspaces и `tsconfig.base.json` paths.
- ✅ Не создаются доменные типы, которые должны быть скопированы между приложениями.
- ✅ Дальнейшие общие типы, SDK, UI и config должны добавляться только в `packages/*`.

---

## 8. Качество кода

Во всех реализованных приложениях должны проходить:

- ✅ lint
- ✅ typecheck
- ✅ build
- ✅ test

Текущее покрытие тестами:

```txt
apps/admin   9 test files   41 tests
apps/api     6 test files   11 tests
apps/web     6 test files   20 tests
apps/worker 10 test files   33 tests
```

Итого:

```txt
31 test files
105 tests
```

---

## 9. Запуск проекта

Из корня проекта успешно выполняются:

```bash
yarn dev
yarn build
yarn lint
yarn typecheck
yarn test
yarn format:check --ignore-unknown
```

Примечание:

- `yarn dev` запускает все workspace dev scripts.
- Для реальной одновременной разработки нескольких долгоживущих сервисов далее будет добавлен отдельный orchestrated dev script.

---

## 10. Соответствие PRD

- ✅ Созданы все приложения, предусмотренные PRD.
- ✅ Архитектура соответствует выбранному стеку.
- ✅ Подготовлена основа для реализации всех MVP-фич.
- ✅ Нет временных решений, противоречащих архитектуре.
- ✅ Каждая технология встроена в проект в соответствии со своей ролью.

---

# Итоговый DoD

Этап **2.2 "Создание приложений"** считается завершённым, если:

- ✅ Все четыре приложения (`api`, `web`, `admin`, `worker`) существуют и запускаются независимо.
- ✅ Каждое приложение имеет production-ready каркас, соответствующий своей ответственности.
- ✅ Все приложения интегрированы в монорепозиторий через Yarn Workspaces.
- ✅ Архитектура реализации полностью соответствует документации (`docs/architecture/*`) и PRD.
- ✅ Используемый стек подключён и подготовлен к дальнейшей разработке:
  - NestJS;
  - React;
  - Vite;
  - Prisma;
  - BullMQ;
  - Redis;
  - Axios;
  - TanStack Query;
  - Zustand;
  - React Hook Form;
  - Zod.
- ✅ Все проверки (`lint`, `typecheck`, `build`, `test`, `dev`) успешно проходят как для отдельных приложений, так и для проекта целиком.
- ✅ Проект готов к переходу к **Этапу 2.3 — Shared Packages**, без необходимости возвращаться к структуре приложений или их базовой конфигурации.
