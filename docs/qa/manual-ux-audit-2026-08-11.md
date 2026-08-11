# Manual UX audit — 2026-08-11

## Scope

Проверен локальный пользовательский поток Reviewsha через Chromium на реальных
API, PostgreSQL, Redis, MinIO, Worker и OmniRoute. Тестовая среда использовала
`http://localhost:5173` (Web), `http://localhost:5174` (Admin) и
`http://localhost:3000/api/v1` (API).

## Проверенные сценарии

### Web

- регистрация и вход пользователя;
- Dashboard и загрузка статистики проекта;
- профиль, смена темы, языка (`en`/`ru`) и уведомлений;
- создание, редактирование, архивирование, восстановление и удаление проекта;
- локальная загрузка ZIP-версии;
- импорт публичного GitHub-репозитория (`octocat/Hello-World`, ветка `master`);
- запуск анализа, отображение прогресса и завершение `100%` (`2/2` AI reviews);
- создание чата, SSE-ответ, отмена/ожидание ответа и сохранение истории;
- список отчётов, сравнение двух отчётов и экспорт Markdown/JSON/PDF;
- project settings, refresh страницы и logout;
- мобильный smoke-check Web и Admin при viewport `390x844`.

### Admin

- admin login и refresh-aware session;
- Dashboard;
- Users и user details;
- Projects и project details;
- Queues и queue metrics;
- AI usage;
- Logs;
- Statistics;
- Settings route;
- запрет входа обычного USER в Admin (`ADMIN_REQUIRED`).

### API и безопасность

- `/auth/me`, обновление профиля, refresh rotation и смена пароля;
- список активных sessions;
- pipeline status;
- project IDOR: чужой пользователь получает `403`;
- invalid GitHub URL получает `404` без создания версии;
- report detail, status, compare и экспорт трёх форматов;
- archive/restore/delete project lifecycle.

## Результат

Основной вертикальный поток прошёл с реальными данными:

```text
Browser → SDK/API → PostgreSQL/Redis/MinIO → Worker → OmniRoute/AI
       → Analysis/Report → Chat SSE → Browser
```

Анализ тестового проекта завершился успешно, отчёты были доступны, а полный
assistant response сохранился в истории чата после обновления страницы.

## Исправления, найденные во время аудита

1. Добавлен Vite dev proxy Web для `/api`, поскольку default relative API URL
   без proxy ломал регистрацию и остальные локальные Web-запросы.
2. Локальный CORS по умолчанию теперь разрешает Web и Admin origins; список
   origins задаётся через comma-separated `CORS_ORIGIN`.
3. Исправлено явное NestJS DI для Admin, Queue, refresh guard, Sessions,
   Users и Pipeline runtime paths.
4. Users service нормализует query pagination, если адаптер передаёт query
   значения строками.

## Ограничения

- Проверен публичный GitHub import, а не OAuth-привязка приватного аккаунта.
- Admin Settings сейчас является информационным route без изменяемых настроек.
- Полный визуальный и accessibility review человеком в браузере остаётся
  отдельной задачей; автоматический smoke-check не заменяет его.
- Production deployment, внешний DNS/TLS и реальные production credentials не
  проверялись в локальном аудите.

## Команды проверки

```bash
yarn test:e2e
yarn docs:check
yarn format:check --ignore-unknown
yarn test:stage11
yarn test:stage13
yarn test:stage14
yarn workspace @reviewsha/api vitest run tests/unit/config tests/unit/common/auth/guards.test.ts tests/unit/modules/admin tests/unit/modules/queue tests/unit/modules/users --coverage=false
```

Результаты автоматической проверки: baseline E2E `2 passed`, документация и
Prettier проверили все `117` Markdown-файлов/ссылок и весь репозиторий,
stage 11/13/14, а также targeted API suite прошли. Полный `yarn test` в
общем рабочем окружении с параллельными локальными API/Worker-процессами
дошёл до `576 passed` и остановился на двух 5-секундных unit timeouts
(`AuthService` и `SessionService`); повторный запуск этих двух файлов отдельно
дал `47 passed`. В чистом CI-окружении полный suite следует запускать отдельно
от долгоживущих dev-сервисов.

Результаты ручных browser-прогонов и API probes сохранены в истории текущей
рабочей сессии; временные сценарии аудита не являются частью production test
suite.
