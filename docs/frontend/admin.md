# Admin application

`apps/admin` — отдельный React/Vite client для операционных и административных
функций. Он использует тот же SDK/auth infrastructure, но отдельный UI shell и
RBAC route guard. Интерфейс разделён на рабочие разделы и системные инструменты:
Dashboard, Users, Projects, Queues, Logs, AI control center, Statistics и
Settings.

## Sections

- Dashboard/overview;
- Users и user details/mutations;
- Projects и project details;
- Queues/jobs/retry/remove;
- masked logs;
- AI usage и breakdown;
- statistics за `24h`, `7d`, `30d`.

## AI control center

Раздел `/ai` управляет runtime-конфигурацией OmniRoute без редактирования
environment variables и без доступа браузера к Redis/BullMQ:

- provider и gateway base URL;
- API key с маскированием в ответах и шифрованием при хранении;
- выбор модели из каталога OmniRoute или ручной ввод model id;
- `maxTokens`, `temperature` и request timeout;
- проверка соединения и обновление каталога моделей;
- usage, latency и provider breakdown.

API key никогда не возвращается в открытом виде. Пустое поле сохраняет текущий
ключ; отдельный checkbox удаляет его. После сохранения Worker читает актуальную
runtime-настройку из `SystemSetting` при следующем AI-запросе.

Backend endpoints:

```text
GET   /api/v1/admin/ai/settings
PATCH /api/v1/admin/ai/settings
GET   /api/v1/admin/ai/models
POST  /api/v1/admin/ai/test-connection
```

Все endpoints требуют JWT и административную роль.

## User administration

`/users` поддерживает поиск, фильтры роли/статуса, pagination и переход в
детали пользователя. В деталях администратор может изменить роль или
активность аккаунта; destructive и access-changing операции требуют явного
сохранения. Backend повторно проверяет роль и не полагается на frontend guard.

## Kubernetes access

В Kubernetes Admin, API и Worker разворачиваются отдельными Deployment/Service.
Для локальной проверки можно использовать port-forward:

```bash
kubectl -n reviewsha port-forward svc/reviewsha-admin 15174:80
kubectl -n reviewsha port-forward svc/reviewsha-api 13000:3000
```

В production Web/Admin и API должны быть объединены Ingress-маршрутизацией
`/api`; отдельные port-forward адреса предназначены только для диагностики.

Frontend guard скрывает routes для UX, однако каждый `/api/v1/admin/*` endpoint
проверяет JWT и role на backend.

## Commands

```bash
yarn workspace @reviewsha/admin dev
yarn workspace @reviewsha/admin test
yarn workspace @reviewsha/admin typecheck
yarn workspace @reviewsha/admin build
```

Admin не подключается к Redis/BullMQ напрямую. Все operational actions идут
через Admin API и логируются/маскируются на backend. OmniRoute также доступен
Worker только через внутренний Kubernetes Service `omniroute`, а не из
браузера.
