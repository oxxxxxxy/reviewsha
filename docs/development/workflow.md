# Development workflow

Проект использует GitHub Actions и pull requests.

```text
branch → implementation → tests → lint/typecheck/format → commit → PR → CI → review → merge
```

## Branches

Используйте короткие branches, например `feat/chat-context`, `fix/helm-values`,
`docs/developer-guide`. Не коммитьте `.env`, generated drift или build output.

## Pull request

PR должен содержать:

- краткое описание изменения;
- affected apps/packages;
- test commands и результаты;
- migration/env/deployment impact;
- обновлённую документацию;
- screenshots для UI changes;
- security/ownership considerations.

Шаблон PR находится в `.github/pull_request_template.md`. CI запускает lint,
typecheck, format, build, OpenAPI, tests, infrastructure и stage checks.

## Commit

Используйте imperative/conventional style (`feat:`, `fix:`, `docs:`, `test:`,
`chore:`). Husky/lint-staged запускает format/typecheck hooks, поэтому перед
commit оставляйте рабочее дерево в ожидаемом состоянии.

## Generated files

`packages/sdk/src/generated/openapi.ts` генерируется из
`docs/generated/openapi.json`. После backend DTO/controller changes запускайте
`yarn sdk:generate`; ручные edits generated file запрещены.
