# Authentication и authorization

API использует JWT access token + rotating refresh sessions. `AuthGuard` и
`RolesGuard` работают на backend; UI route guard только улучшает UX.

## Flow

```text
register/login
  → access token + refresh token
  → authenticated API calls
  → access 401
  → refresh rotation
  → retry once
  → logout if refresh fails
```

Refresh token хранится/проверяется как hash в `Session`; reuse detection отзывает
скомпрометированную цепочку. Logout отзывает одну session, logout-all — все
sessions пользователя.

## Roles

- `USER` — обычные собственные projects/resources;
- `ADMIN` — admin operational/user/project endpoints;
- `SUPER_ADMIN` — расширенная административная роль, если endpoint явно её
  допускает.

JWT role check не заменяет ownership check. Для project/report/chat сначала
проверяйте принадлежность ресурса, затем применяйте дополнительные permissions.

## API usage

```http
Authorization: Bearer <access-token>
```

SDK делает transport/auth handling; feature components не должны вручную
собирать Authorization header.

## Security rules

- passwords хранятся только как Argon2 hash;
- access/refresh secrets задаются через env;
- tokens и passwords не пишутся в logs;
- неизвестные DTO fields отклоняются;
- чужой UUID не является основанием для доступа: ownership проверяется query/service.
