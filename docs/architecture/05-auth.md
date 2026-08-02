# Архитектура авторизации проекта "Ревьюша"

## 1. Назначение документа

Этот документ описывает систему аутентификации и авторизации:

- регистрацию пользователей;
- вход в систему;
- JWT;
- refresh token;
- управление сессиями;
- роли;
- права доступа;
- защиту API.

---

# 2. Общая концепция

Система использует:

```
JWT + Refresh Token
```

Авторизация построена по принципу:

```
Authentication

↓

Кто пользователь?


Authorization

↓

Что пользователь может делать?
```

---

# 3. Основные компоненты

Auth система состоит из:

```
AuthModule

├── AuthController
├── AuthService
├── JwtService
├── TokenService
├── PasswordService
└── Guards
```

---

# 4. Регистрация пользователя

Сценарий:

```
Пользователь

↓

POST /auth/register

↓

AuthController

↓

AuthService

↓

PasswordService

↓

Hash пароля

↓

Создание User

↓

Создание Session

↓

Выдача токенов
```

---

## Данные регистрации

Пример:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Alex"
}
```

---

# 5. Хранение паролей

Пароли никогда не хранятся напрямую.

Используется:

```
Password

↓

Hash

↓

Database
```

Например:

```
argon2
```

Хранится:

```
passwordHash
```

---

# 6. JWT система

Используется два типа токенов:

```
Access Token

+

Refresh Token
```

---

# 6.1 Access Token

Назначение:

Авторизация API запросов.

Свойства:

- короткий срок жизни;
- хранится на клиенте;
- передаётся через Authorization Header.

Пример:

```
Authorization:

Bearer token
```

Содержит:

```json
{
"userId": "...",
"role": "USER"
}
```

---

# 6.2 Refresh Token

Назначение:

Получение нового Access Token.

Свойства:

- длинный срок жизни;
- хранится в Session;
- может быть отозван.

---

# 7. Жизненный цикл токена

## Вход

```
Email

+

Password

↓

Проверка

↓

Создание Session

↓

Access Token

+

Refresh Token
```

---

## Обновление

```
Refresh Token

↓

Проверка Session

↓

Создание новых токенов
```

---

## Выход

```
Logout

↓

Удаление Session

↓

Refresh Token становится недействительным
```

---

# 8. Session Management

Каждый вход создаёт отдельную Session.

Пример:

```
User

|

+-- Chrome Windows

|

+-- Firefox Linux

|

+-- Mobile
```

---

Session хранит:

```
id

userId

refreshTokenHash

device

ip

expiresAt
```

---

Возможности:

- просмотр активных устройств;
- выход со всех устройств;
- удаление отдельной сессии.

---

# 9. Guards

## JWT Guard

Проверяет:

- наличие токена;
- валидность;
- пользователя.

Используется:

```
@UseGuards(JwtGuard)
```

---

## Roles Guard

Проверяет права.

Например:

```
ADMIN

USER
```

---

Пример:

```
GET /admin/users

↓

JwtGuard

↓

RolesGuard

↓

ADMIN?
```

---

# 10. Ролевая модель

## Системные роли

```
USER

ADMIN
```

---

## Проектные роли

Используются через ProjectMember.

```
OWNER

EDITOR

VIEWER
```

---

## Организационные роли

Для Team:

```
OWNER

ADMIN

MEMBER
```

---

# 11. Проверка доступа к проектам

Пример:

Пользователь открывает проект:

```
GET /projects/:id
```

Проверка:

```
JWT

↓

User

↓

Project

↓

ProjectMember

↓

Permission
```

---

Правила:

OWNER:

- полный доступ.

EDITOR:

- изменение проекта;
- запуск анализа.

VIEWER:

- просмотр.

---

# 12. Permission система

Для масштабируемости используется permission подход.

Пример:

```
project.read

project.update

project.delete

scan.create

report.read

organization.manage
```

---

Роли содержат набор разрешений.

Например:

```
OWNER

=
project.*
+
scan.*
+
report.*
```

---

# 13. Защита API

Все приватные endpoints защищены:

```
Controller

↓

Guard

↓

Service

↓

Repository
```

---

Пример:

```
POST /projects/:id/scan
```

Проверки:

1. Пользователь авторизован.
2. Пользователь имеет доступ к проекту.
3. Пользователь имеет право запуска анализа.

---

# 14. Rate Limiting

Защита от:

- перебора паролей;
- злоупотребления AI;
- большого количества запросов.

Используется:

```
Redis
+
Rate Limiter
```

---

Ограничения:

Например:

```
Login:

5 попыток / минуту


AI Chat:

N запросов / минуту
```

---

# 15. Безопасность файлов

При загрузке проекта проверяется:

- владелец;
- размер;
- расширение;
- содержимое;
- права доступа.

---

Запрещается:

- доступ к чужим MinIO объектам;
- получение файлов без проверки прав.

---

# 16. Взаимодействие с другими модулями

## UsersModule

Auth использует:

```
User
```

---

## ProjectsModule

Использует:

```
ProjectMember

Permissions
```

---

## OrganizationsModule

Использует:

```
OrganizationMember
```

---

# 17. API Endpoints

## Регистрация

```
POST /auth/register
```

---

## Вход

```
POST /auth/login
```

---

## Обновление токена

```
POST /auth/refresh
```

---

## Выход

```
POST /auth/logout
```

---

## Выход со всех устройств

```
POST /auth/logout-all
```

---

## Текущий пользователь

```
GET /auth/me
```

---

# 18. Будущие расширения

Архитектура позволяет добавить:

- OAuth через GitHub;
- Google Login;
- SSO Enterprise;
- API Keys;
- двухфакторную аутентификацию;
- WebAuthn.

---

# 19. Итоговая схема

```
              User

               |

            Login

               |

          AuthService

               |

      ------------------

      |                |

 JWT Access      Refresh Token

      |                |

      |             Session

      |

 API Guards

      |

 Protected Routes
```

Главный принцип:

> Пользователь всегда идентифицирован через JWT, а доступ к данным проверяется через роли и права.


---

# 18. Реализация Stage 4.2 AuthModule

Backend реализация находится в:

```txt
apps/api/src/modules/auth
```

## 18.1 Endpoints

Под глобальным prefix `/api/v1` доступны:

```txt
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/logout-all
POST /auth/refresh
GET  /auth/me
```

## 18.2 Token model

Access Token:

- JWT;
- подписывается `JWT_SECRET`;
- короткий TTL `JWT_EXPIRES_IN`;
- не хранится в БД;
- передаётся через `Authorization: Bearer <token>`.

Refresh Token:

- JWT;
- подписывается `JWT_REFRESH_SECRET`;
- TTL `JWT_REFRESH_EXPIRES_IN`;
- хранится в PostgreSQL только как SHA-256 hash;
- поддерживает rotation;
- может быть отозван точечно или полностью для пользователя.

## 18.3 Password hashing

Пароли хешируются через Argon2. Открытый пароль никогда не сохраняется и не логируется.

## 18.4 Guards and decorators

Реализованы:

- `JwtAuthGuard`;
- `RefreshAuthGuard`;
- `RolesGuard`;
- `@CurrentUser()`;
- `@Public()`;
- `@Roles()`.

## 18.5 Session management

Несколько устройств поддерживаются через несколько записей `refresh_tokens`. `logout` отзывает один refresh token, `logout-all` отзывает все активные refresh token пользователя.

## 18.6 Security rules

- Refresh Token rotation обязательна.
- Повторное использование отозванного Refresh Token возвращает `401`.
- Неактивный пользователь не может login/refresh/me.
- Логи не содержат password/JWT/refresh token.

---

# 19. Реализация Stage 4.3 JWT Infrastructure

JWT вынесен из бизнес-логики авторизации в централизованный инфраструктурный слой.

## 19.1 JwtConfig

Типизированная конфигурация находится в:

```txt
apps/api/src/config/jwt.config.ts
```

Конфиг разделён на две области:

- Access Token;
- Refresh Token.

Обе области используют:

- secret из ENV;
- TTL из ENV;
- issuer;
- audience;
- algorithm `HS256`.

## 19.2 TokenService

Единая точка работы с JWT:

```txt
apps/api/src/modules/auth/services/token.service.ts
```

TokenService отвечает за:

- `generateAccessToken()`;
- `generateRefreshToken()`;
- `generateTokenPair()`;
- `verifyAccessToken()`;
- `verifyRefreshToken()`;
- `decodeToken()` только для диагностики;
- hash Refresh Token перед сохранением;
- расчёт срока жизни Refresh Token;
- единый mapping JWT ошибок в `401 Unauthorized`.

Сервисы приложения не используют `JwtService.sign()` / `JwtService.verify()` напрямую.

## 19.3 Guards integration

`JwtAuthGuard` и `RefreshAuthGuard` используют `TokenService` как единственный механизм проверки токенов.

Guard выполняет:

1. извлечение токена из HTTP request;
2. верификацию через TokenService;
3. загрузку пользователя через Repository Layer;
4. проверку активности пользователя;
5. запись безопасного `request.user`.

## 19.4 Payload

Payload типизирован отдельно:

```txt
interfaces/access-token.interface.ts
interfaces/refresh-token.interface.ts
interfaces/token-pair.interface.ts
```

Access Token содержит минимальный набор:

- `sub`;
- `email`;
- `role`;
- `type`;
- `jti`.

Refresh Token также содержит уникальный `jti`.

## 19.5 Refresh Token storage

Согласно архитектуре хранения Refresh Token в PostgreSQL сохраняется только как SHA-256 hash. Открытый JWT в базе не хранится.

## 19.6 Extensibility

JWT Infrastructure подготовлена к будущему расширению:

- OAuth providers;
- Google/GitHub/Discord login;
- Magic Links;
- API Tokens;
- Personal Access Tokens;
- переход на RS256/ES256 через замену JwtConfig и TokenService без переписывания AuthModule.
