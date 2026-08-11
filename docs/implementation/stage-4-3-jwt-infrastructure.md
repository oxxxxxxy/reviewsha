# Stage 4.3 JWT Infrastructure

> **Historical implementation note.** This document records an earlier plan or execution checkpoint. It is retained for traceability; current behavior is defined by code and the canonical docs index.

Status: COMPLETE

## Summary

Stage 4.3 extracts JWT handling into a centralized infrastructure layer used by AuthModule and all future backend modules.

## Implemented artifacts

- `apps/api/src/config/jwt.config.ts`
- `apps/api/src/modules/auth/services/token.service.ts`
- `apps/api/src/modules/auth/interfaces/access-token.interface.ts`
- `apps/api/src/modules/auth/interfaces/refresh-token.interface.ts`
- `apps/api/src/modules/auth/interfaces/token-pair.interface.ts`
- TokenService-backed `JwtAuthGuard`
- TokenService-backed `RefreshAuthGuard`

## Responsibilities

`TokenService` is the only application-level service allowed to generate, verify, decode and hash JWT/Refresh Token values.

Implemented methods:

- `generateAccessToken()`
- `generateRefreshToken()`
- `generateTokenPair()`
- `verifyAccessToken()`
- `verifyRefreshToken()`
- `decodeToken()`
- `hashRefreshToken()`
- `getRefreshTokenExpiresAt()`
- JWT error mapping to `UnauthorizedException`

## Security rules

- Access Token is never stored in PostgreSQL.
- Refresh Token is stored only as hash.
- Passwords remain Argon2 hashes.
- JWT, Refresh Token and full payload are never logged.
- Guards verify tokens through TokenService only.
- Protected requests receive a minimal `request.user` object.

## Validation

Local checks passed:

```bash
yarn workspace @reviewsha/api lint
yarn workspace @reviewsha/api typecheck
yarn workspace @reviewsha/api build
yarn workspace @reviewsha/api test
```
