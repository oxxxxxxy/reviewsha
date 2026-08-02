# Stage 4.5 Guards

Status: COMPLETE

## Summary

Stage 4.5 moves route security infrastructure into `apps/api/src/common/auth` and enables global API protection.

## Implemented artifacts

```txt
apps/api/src/common/auth/
├── constants/
├── decorators/
├── guards/
├── interfaces/
├── types/
└── index.ts
```

## Guards

- `JwtAuthGuard`
- `RefreshAuthGuard`
- `RolesGuard`
- `OwnershipGuard`
- `ApiKeyGuard`

## Decorators

- `@Public()`
- `@CurrentUser()`
- `@Roles()`
- `@Ownership()`

## Global protection

`JwtAuthGuard` is registered as `APP_GUARD` in `AppModule`.

All endpoints are private by default. Public endpoints must be explicitly decorated with `@Public()`.

## Security rules

- Guards do not log JWT or sensitive payloads.
- `401` is used for unauthenticated requests.
- `403` is used for authorization failures.
- Ownership checks deny by default until resource-specific checker integration is added.
- API key guard reads `INTERNAL_API_KEY` from config.

## Validation

Covered by API unit/integration tests and full local CI.
