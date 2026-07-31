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
