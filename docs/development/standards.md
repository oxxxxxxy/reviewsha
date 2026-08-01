# Development Standards

## Naming

### Backend

- Modules: `AuthModule`, `ProjectsModule`.
- Controllers: `AuthController`, `ProjectsController`.
- Services: `AuthService`, `ProjectsService`.
- Repositories: `AuthRepository`, `ProjectsRepository`.
- DTO: `CreateProjectDto`, `UploadFileDto`, `CreateScanDto`.
- Events: `ProjectCreatedEvent`, `ScanStartedEvent`.

### Frontend

- Pages: `DashboardPage.tsx`, `ProjectsPage.tsx`.
- Components: `ProjectCard.tsx`, `UploadDropzone.tsx`.
- Hooks: `useProjects.ts`, `useUpload.ts`.
- Stores: `ui.store.ts`, `auth.store.ts`.
- Schemas: `login.schema.ts`, `project.schema.ts`.

### Database

- Tables use snake_case plural names: `users`, `projects`, `reports`, `files`, `scan_jobs`.
- Foreign keys use `<entity>_id`.
- Enum values use uppercase names in TypeScript and stable lowercase values in persistence when needed.

## Imports

Use workspace packages for shared code:

```ts
import { Button } from '@reviewsha/ui';
import type { Project } from '@reviewsha/types';
import { QUEUE_NAMES } from '@reviewsha/config';
```

Use application aliases for local application code:

```ts
import { LoginPage } from '@/pages/Login/LoginPage';
import { apiClient } from '@/api/client';
```

Forbidden:

```ts
import { Button } from '../../../packages/ui/src/components/Button';
import { Project } from '../../../packages/types/src/project/project.types';
```

## Configuration

- Every app owns `.env.example`.
- Runtime env is validated by the app config layer.
- `process.env` is allowed only inside backend/worker config files.
- Browser env is read only from frontend config files.

## Logging

Use the shared format:

```txt
[Timestamp] Service Level Context Message
```

Example:

```txt
[2026-08-01T18:24:15.000Z] API INFO AuthService User created
```

## Errors

- Backend errors use normalized `ErrorResponseBody`.
- Worker errors use normalized queue/job error metadata.
- Frontend errors are captured through Error Boundaries and global handlers.

## Tests

- Production source code lives in `src/**`.
- Unit and infrastructure tests live in `tests/unit/**` inside each workspace.
- Cross-workspace acceptance tests live in root `tests/stage2/**`.
- Browser E2E tests live in root `tests/e2e/**`.
- New exported behavior must be covered by tests in the same workspace, but outside `src`.
- Test helpers that are runtime-specific may stay under `src/test/**` only when they are imported by test code and excluded from production builds.

Example:

```txt
apps/web/src/app/router.tsx
apps/web/tests/unit/app/router.test.tsx
```

## Public API documentation

- Public exported classes, functions, interfaces and reusable UI components should include TSDoc comments.
- Comments must explain responsibility and integration contract, not restate the implementation line by line.
- Shared package documentation is generated with TypeDoc:

```bash
yarn docs:api
```

Generated output is written to `docs/generated/api` and is intentionally ignored by Git.

## File size and class size

- Prefer small classes with one operational responsibility.
- Extract repeated connection, factory, formatter and validation logic into focused helpers.
- Large classes are acceptable only for framework composition roots where splitting would reduce readability.
