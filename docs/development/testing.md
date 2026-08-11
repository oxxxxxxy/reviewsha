# Testing

## Основные команды

```bash
yarn test                 # packages и apps
yarn ci:unit              # полный unit/integration suite
yarn test:e2e:install     # один раз установить Chromium
yarn test:e2e
yarn ci:quality           # lint, typecheck, format
yarn ci:openapi           # SDK drift + OpenAPI validation
yarn docs:check           # internal Markdown links и docs invariants
```

Stage commands сфокусированы на функциональных границах:

```bash
yarn ci:stage4
...
yarn ci:stage14
```

Точные команды находятся в root `package.json`; не добавляйте в документацию
несуществующие `test:unit`/`test:integration` scripts.

## Уровни тестов

- **Unit** — services, mappers, DTO, processors, builders и pure helpers.
- **Integration** — HTTP/controller boundaries, repositories и queue/pipeline
  behavior с test doubles или local dependencies.
- **E2E** — пользовательские flows Web/API/Worker; требуют services и fixtures.
- **Contract** — OpenAPI generation, `sdk:check`, typed stream/error schemas.
- **Infrastructure** — Compose config, Helm lint/template, kubeconform и image
  builds в GitHub Actions.

## Что добавлять с изменением

- новый business rule → unit test;
- новый API endpoint → DTO/controller integration + OpenAPI/SDK check;
- новая queue/job → processor idempotency/retry tests;
- новый UI flow → component/query test и loading/error/empty states;
- новый env/manifest → schema/validation и docs update.

## Flaky/real provider tests

Не делайте внешний AI provider обязательным для deterministic unit tests.
Используйте mock/local provider, а real OmniRouter/DeepSeek flow запускайте в
отдельном integration/manual environment.
