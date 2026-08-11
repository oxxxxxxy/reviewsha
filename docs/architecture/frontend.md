# Frontend architecture

Web и Admin — отдельные React 19 + Vite приложения. Они используют общий
`@reviewsha/ui`, `@reviewsha/sdk`, `@reviewsha/types` и query/data layer.

```text
Route component
  → feature/query hook
  → SDK service
  → ApiClient
  → NestJS API
```

## State ownership

- server state: query layer/cache;
- auth state: auth provider/store и SDK token callbacks;
- UI state: React state;
- form state: form layer + Zod schemas;
- persistent domain state: backend, не localStorage.

## Authentication

API client добавляет access token. При `401` auth layer пытается refresh и
повторяет запрос; при ошибке refresh очищает сессию и направляет пользователя
на login. Frontend route guard не заменяет backend authorization.

## UI Kit

Переиспользуемые Button/Input/Modal/Table/EmptyState/Pagination и tokens должны
жить в `packages/ui`. Feature-specific component может находиться в app, если
он не является общим primitive.

## Streaming

Обычные запросы идут через generated SDK. Chat SSE использует typed streaming
client и события `token`, `complete`, `error`; компонент не должен разбирать
произвольный текстовый поток.
