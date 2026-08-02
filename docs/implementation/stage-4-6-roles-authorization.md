# Stage 4.6 Roles & Authorization

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
