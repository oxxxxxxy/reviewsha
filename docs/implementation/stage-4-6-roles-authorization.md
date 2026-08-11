# Stage 4.6 Roles & Authorization

> **Historical implementation note.** This document records an earlier plan or execution checkpoint. It is retained for traceability; current behavior is defined by code and the canonical docs index.

Status: COMPLETE

## Summary

Stage 4.6 adds centralized RBAC rules and authorization policies.

## Implemented artifacts

```txt
apps/api/src/common/authorization/
├── constants/permission.constants.ts
├── interfaces/policy.interface.ts
├── policies/authorization.policies.ts
├── roles/role.constants.ts
└── index.ts
```

## Role constants

Use `APP_ROLES` instead of string role literals.

Current roles:

- `APP_ROLES.USER`
- `APP_ROLES.ADMIN`

## Policies

`AUTHORIZATION_POLICIES` describes route-level access rules for:

- auth;
- sessions;
- users;
- projects readiness;
- admin readiness.

## Endpoint rules

All existing endpoints are explicit:

- public endpoints use `@Public()`;
- protected endpoints use `@Roles(...)`.

## Guards integration

`RolesGuard` is globally registered through `APP_GUARD` and reads metadata from `@Roles(...)`.

## Future readiness

The layer includes future permission constants and `ownershipRequired` policy metadata for PBAC and organization roles.


## Stage 4 final audit updates

- Current-user profile updates are available through `PATCH /api/v1/auth/me`.
- User deletion uses soft delete: `deletedAt` is set and `isActive` becomes `false`.
- `SessionRepository` is an explicit Sessions module repository over refresh-token persistence.
- JWT defaults to `HS256`; config types are prepared for future `RS256`/`ES256` migration.
- Stage 4 critical backend logic is validated by `yarn test:stage4` with coverage thresholds.
