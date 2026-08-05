# Stage 5.1 Projects Module

Status: COMPLETE

## Scope

Projects is the first domain module after the authentication foundation. It owns project API contracts, ownership-aware access, lifecycle events and the application-facing service layer. File uploads, scans, reports, tags and project history remain separate follow-up modules.

## Structure

```txt
apps/api/src/modules/projects/
├── constants/
├── controllers/projects.controller.ts
├── dto/
├── events/project.events.ts
├── interfaces/
├── mappers/project.mapper.ts
├── entities/project.entity.ts
├── repositories/projects.repository.ts
├── services/projects.service.ts
└── projects.module.ts
```

The module uses the existing `ProjectRepository` from the central Repository Layer. The module-local repository file exports that implementation as `ProjectsRepository` without duplicating database logic.

## API

All routes are under `/api/v1/projects` and require an authenticated USER or ADMIN. Regular users are restricted to their own projects; ADMIN can access any active project.

```txt
GET    /projects
GET    /projects/:id
POST   /projects
PATCH  /projects/:id
POST   /projects/:id/archive
DELETE /projects/:id
```

List responses use the API contract envelope `{ data, meta }`. Project responses never expose Prisma entities directly; `ProjectMapper` converts dates to ISO strings.

## Persistence and lifecycle

- `ProjectRepository` provides filtered/paginated queries, ownership-scoped lookup, create/update/archive and soft delete.
- `ProjectsService` contains ownership and input business rules; controllers only bind HTTP data.
- `ProjectEvents` publishes `project.created`, `project.updated`, `project.archived` and `project.deleted` events for future queue, notification and audit subscribers.
- The current Prisma model stores `language`; the public contract follows the existing architecture/API naming. Tags and history are intentionally deferred to Stage 5.2.

## Tests and CI

Run the decomposed Stage 5 job locally:

```bash
yarn test:stage5
```

It covers repository filtering/scoping, service ownership/admin behavior, lifecycle events, DTO validation, HTTP integration and authorization metadata. GitHub Actions runs the same command in the dedicated `stage5-tests` job.
