# @reviewsha/types

Shared TypeScript types for Reviewsha.

Contains common API, auth, project, report, queue and AI interfaces/enums.

Rules:

- no business logic;
- public API is exported only through `src/index.ts`;
- apps import types from `@reviewsha/types`, not via relative paths.
