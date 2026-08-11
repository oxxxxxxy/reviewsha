# SDK и UI Kit

## SDK

`packages/sdk` содержит generated OpenAPI types и typed API services:
`AuthAPI`, `ProjectsAPI`, `UploadsAPI`, `ReportsAPI`, `ChatAPI`, `AdminAPI`.
`createReviewshaSDK` принимает base URL и auth/transport configuration.

```bash
yarn sdk:generate
yarn sdk:check
yarn workspace @reviewsha/sdk typecheck
yarn workspace @reviewsha/sdk test
```

Generated `packages/sdk/src/generated/openapi.ts` нельзя изменять вручную.
Streaming имеет dedicated typed client; REST методы остаются generated SDK.

## Error handling

SDK нормализует documented API error envelope в `ApiClientError` с status и
payload. UI переводит errors в понятные сообщения, но не показывает raw stack
trace или secrets.

## UI Kit

`packages/ui` содержит reusable primitives, layouts, tokens и hooks. Новые
общие компоненты добавляются туда с unit/UI tests; feature-specific API logic
остаётся в app query layer.
