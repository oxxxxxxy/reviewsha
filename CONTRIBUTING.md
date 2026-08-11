# Contributing to Reviewsha

Спасибо за вклад. Reviewsha — Yarn Classic monorepo; изменения должны сохранять
границы API/Web/Admin/Worker и обновлять документацию вместе с кодом.

## Setup

Следуйте [installation guide](docs/getting-started/installation.md), затем
запустите targeted workspace и tests.

## Before PR

```bash
yarn lint
yarn typecheck
yarn format:check --ignore-unknown
yarn ci:openapi
yarn docs:check
git diff --check
```

Для изменённого этапа запустите relevant `yarn ci:stageN`. Для схемы/миграции
проверьте Prisma commands; для Docker/Helm — соответствующие manifest checks.

## PR checklist

- [ ] Code follows existing module/package boundaries.
- [ ] Tests cover the changed behavior and security boundary.
- [ ] DTO/OpenAPI/SDK are synchronized.
- [ ] Environment/migration/deployment impact is documented.
- [ ] UI changes include loading/error/empty states and screenshots when useful.
- [ ] No secrets, generated drift or build artifacts are committed.
- [ ] README/docs links and commands remain valid.

Use the GitHub PR template. CI is authoritative for merge checks; local success
helps reproduce failures but does not replace review.
