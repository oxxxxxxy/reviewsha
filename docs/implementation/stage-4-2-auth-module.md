# Этап 4.2 — Auth Module

> **Historical implementation note.** This document records an earlier plan or execution checkpoint. It is retained for traceability; current behavior is defined by code and the canonical docs index.

**Статус:** ✅ COMPLETE

## Результат

Реализована JWT-аутентификация Backend API с Access Token, Refresh Token, rotation и session management.

## Endpoints

```txt
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/logout-all
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
PATCH /api/v1/auth/me
```

## Security

- Пароли хешируются Argon2.
- Refresh Token сохраняется только как Argon2 hash.
- Access Token не сохраняется в БД.
- Refresh Token rotation отзывает старый token.
- Logout отзывает один refresh token.
- Logout All отзывает все refresh tokens пользователя.
- Неактивные пользователи блокируются.
- Логи не содержат пароли или токены.

## Architecture

```txt
AuthController
  ↓
AuthService
  ↓
UserRepository + RefreshTokenRepository
  ↓
PrismaService
```

## Guards / Strategies / Decorators

Реализованы:

- `JwtStrategy`;
- `RefreshStrategy`;
- `JwtAuthGuard`;
- `RefreshAuthGuard`;
- `RolesGuard`;
- `@CurrentUser()`;
- `@Public()`;
- `@Roles()`.

## Tests

Покрыто unit и integration tests: register/login/logout/logout-all/refresh/me, token rotation, roles, inactive user, Swagger Bearer auth, DTO/guards/decorators/strategies, отсутствие утечек паролей и токенов в логах.
