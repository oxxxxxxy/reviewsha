# Этап 3.5 — Repository Layer

**Статус:** ✅ COMPLETE

## Результат

Создан единый Repository Layer для доступа к данным Backend API. Prisma скрыта за инфраструктурными репозиториями, а будущая бизнес-логика должна работать только через DI.

## Структура

```txt
apps/api/src/repositories/
├── base/
│   ├── base.repository.ts
│   └── repository.interface.ts
├── auth/
│   ├── refresh-token.repository.ts
│   └── refresh-token.repository.interface.ts
├── chat/
│   ├── chat-message.repository.ts
│   ├── chat-message.repository.interface.ts
│   ├── chat-session.repository.ts
│   └── chat-session.repository.interface.ts
├── finding/
├── project/
├── queue/
├── report/
├── scan/
├── upload/
├── user/
├── repositories.module.ts
└── index.ts
```

## Репозитории

Реализованы:

- `UserRepository`;
- `ProjectRepository`;
- `UploadedFileRepository`;
- `ScanRepository`;
- `ReportRepository`;
- `FindingRepository`;
- `RefreshTokenRepository`;
- `QueueJobRepository`;
- `ChatSessionRepository`;
- `ChatMessageRepository`.

Каждый репозиторий имеет интерфейс и использует `PrismaService` через NestJS DI.

## BaseRepository

`BaseRepository<TModel>` содержит общие операции для сущностей с `id`:

- `findById()`;
- `exists()`;
- `count()`;
- `deleteById()`;
- `transaction()`.

Специфичные запросы остаются в конкретных репозиториях.

## Транзакции

Методы принимают `RepositoryOptions` с `tx?: Prisma.TransactionClient`, поэтому будущие сервисы смогут выполнять несколько операций в одной транзакции без обхода Repository Layer.

## Правила

- Repository содержит только data access logic.
- Repository не выбрасывает HTTP/Nest exceptions.
- Repository не содержит бизнес-валидацию.
- Доменным сервисам запрещены прямые вызовы `prisma.<model>.*`.
- Общий код доступа к БД не дублируется между модулями.

## Тесты

Добавлены unit-тесты для всех основных репозиториев и `BaseRepository` через мок `PrismaService` без подключения к реальной БД.
