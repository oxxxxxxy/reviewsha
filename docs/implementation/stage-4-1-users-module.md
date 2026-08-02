# Этап 4.1 — Users Module

**Статус:** ✅ COMPLETE

## Результат

Реализован первый доменный backend-модуль `UsersModule` для CRUD пользователей без авторизации.

## Структура

```txt
apps/api/src/modules/users/
├── users.module.ts
├── controllers/users.controller.ts
├── services/users.service.ts
├── repositories/user.repository.ts
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   ├── user-query.dto.ts
│   └── user-response.dto.ts
├── mappers/user.mapper.ts
├── validators/
├── guards/
├── decorators/
├── constants/
├── interfaces/
└── types/
```

## API

Все маршруты работают под глобальным префиксом `/api/v1`:

```txt
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id
```

## Ответственность

`UsersModule` отвечает только за пользователей:

- создание;
- чтение;
- обновление;
- удаление;
- пагинацию;
- поиск по `email` и `displayName`;
- сортировку по `createdAt`, `displayName`, `email`.

Auth/login/token logic будет реализован отдельно в `AuthModule`.

## Архитектура

```txt
UsersController
  ↓
UsersService
  ↓
UserRepository
  ↓
PrismaService
  ↓
PostgreSQL
```

`UsersService` не использует Prisma напрямую и работает только через `UserRepository`.

## Безопасность данных

`UserResponseDto` и `UserMapper` никогда не возвращают `passwordHash` наружу.

Пароль при создании сохраняется с использованием Argon2 — того же алгоритма, который применяется Auth Module при регистрации и входе.

## Тесты

Добавлены unit и integration tests:

- CRUD пользователей;
- поиск;
- пагинация;
- сортировка;
- duplicate email conflict;
- DTO validation;
- mapper без `passwordHash`;
- Swagger document paths;
- logging без раскрытия пароля.
