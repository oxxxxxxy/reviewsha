# Конфигурация

Конфигурация валидируется Zod-схемами на старте приложения. Полные шаблоны
находятся в `.env.example`, `apps/api/.env.example`, `apps/worker/.env.example`,
`apps/web/.env.example` и `apps/admin/.env.example`.

## API

| Переменная | Назначение | Default/development |
| --- | --- | --- |
| `NODE_ENV` | режим запуска | `development` |
| `API_HOST` / `API_PORT` | bind API | `0.0.0.0` / `3000` |
| `API_PREFIX` | versioned prefix | `api/v1` |
| `CORS_ORIGIN` | origin Web | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | local Reviewsha DB |
| `REDIS_URL` или `REDIS_HOST`/`REDIS_PORT` | Redis connection | `redis://localhost:6379` |
| `MINIO_ENDPOINT`/`MINIO_PORT` | object storage | `http://localhost:9000` |
| `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` | storage credentials | local placeholders |
| `JWT_SECRET`/`JWT_REFRESH_SECRET` | signing secrets | replace outside development |
| `JWT_EXPIRES_IN`/`JWT_REFRESH_EXPIRES_IN` | token lifetime | `15m` / `30d` |
| `INTERNAL_API_KEY` | internal service calls | replace outside development |
| `CHAT_MESSAGE_MAX_LENGTH` | max chat message | `4000` |
| `CHAT_CONTEXT_MAX_TOKENS` | max chat context | `8000` |
| `CHAT_REQUEST_TIMEOUT_MS` | chat request timeout | `60000` |
| `CHAT_CONTEXT_CACHE_TTL_SECONDS` | context cache TTL | `900` |

В production API отклоняет небезопасные development defaults для database,
JWT, internal API key и MinIO credentials.

## Worker и AI

| Переменная | Назначение | Default/development |
| --- | --- | --- |
| `WORKER_NAME` | имя Worker | `reviewsha-worker` |
| `WORKER_REDIS_REQUIRED` | требовать Redis при старте | `false` |
| `WORKER_CONCURRENCY` | параллелизм job processor | `3` |
| `REDIS_URL` | Redis/BullMQ | `redis://localhost:6379` |
| `AI_PROVIDER` | `deepseek`, `openai`, `local` или `mock` | `deepseek` |
| `OMNIROUTER_API_KEY` | ключ OmniRouter/provider | empty locally, required for remote production |
| `OMNIROUTER_BASE_URL` | provider gateway | local OmniRouter URL |
| `AI_MODEL` | model identifier | `ds-web/deepseek-v4-pro` |
| `AI_MAX_TOKENS` | generation limit, including reasoning and structured output | `6000` |
| `AI_TEMPERATURE` | generation temperature | `0.2` |
| `AI_TIMEOUT_MS` | provider timeout | `60000` |
| `AI_RETRY_ATTEMPTS` / `AI_RETRY_DELAY_MS` / `AI_RETRY_MAX_DELAY_MS` | retry policy; 429 `Retry-After` is respected | `3` / `1000` / `120000` |
| `AI_MAX_CONCURRENCY` | provider concurrency per worker pod | `3` (production Helm: `1`) |
| `AI_DAILY_REQUEST_LIMIT` | daily quota | `500` |
| `AI_INPUT_MAX_TOKENS` | input budget | `12000` |
| `OMNIROUTE_DASHBOARD_URL` | URL OmniRoute, доступный браузеру Admin | `http://localhost:20128` locally |

## Web и Admin

Оба Vite-приложения используют одну переменную:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

`VITE_*` значения попадают в browser bundle. В них нельзя хранить секреты,
JWT signing keys или provider API keys.

## Production rules

- Не использовать development defaults.
- Не коммитить `.env` и реальные secrets.
- Перед rollout проверить `NODE_ENV=production` и health/readiness.
- Перед изменением переменной обновить шаблоны и этот документ.

### OmniRoute provider health

`OMNIROUTER_API_KEY` authenticates Reviewsha to the local OmniRoute gateway; it
is not an upstream DeepSeek credential. OmniRoute must have at least one
connected provider in its own dashboard (or `DEEPSEEK_API_KEY` configured for a
headless deployment). If the upstream provider returns `429`, the worker now
backs off using `Retry-After` when supplied, caps the delay, and limits
concurrency in the production Helm values. A provider that is permanently
rate-limited still needs a second connected provider or a valid replacement
credential; retries cannot manufacture upstream quota.
