# @reviewsha/sdk

Единый TypeScript SDK для работы с Backend API проекта «Ревьюша».

## Назначение

Frontend-приложения не должны собирать HTTP-запросы вручную. Все обращения к API должны проходить через этот пакет.

## Содержит

- `ApiClient` на базе Axios;
- настройку `baseURL`, `timeout`, JSON headers и Authorization header;
- доменные API-сервисы: `AuthAPI`, `ProjectsAPI`, `UploadsAPI`, `ReportsAPI`, `ChatAPI`, `AdminAPI`;
- фабрику `createReviewshaSDK`.

## Команды

```bash
yarn workspace @reviewsha/sdk lint
yarn workspace @reviewsha/sdk typecheck
yarn workspace @reviewsha/sdk test
yarn workspace @reviewsha/sdk build
```
