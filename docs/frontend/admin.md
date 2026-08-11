# Admin application

`apps/admin` — отдельный React/Vite client для операционных и административных
функций. Он использует тот же SDK/auth infrastructure, но отдельный UI shell и
RBAC route guard.

## Sections

- Dashboard/overview;
- Users и user details/mutations;
- Projects и project details;
- Queues/jobs/retry/remove;
- masked logs;
- AI usage и breakdown;
- statistics за `24h`, `7d`, `30d`.

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
через Admin API и логируются/маскируются на backend.
