# Этап 9 — AI Pipeline

Статус: **COMPLETE**. Реализация находится в `apps/worker/src/ai`,
`apps/worker/src/processors` и `apps/worker/src/reporting`.

## Полный поток

```text
Merge(context.json)
  → AIProjectParser
  → ChunkBuilderService
  → ContextBuilderService
  → PromptBuilderService
  → AIService
  → OmniRouterProvider / DeepSeek
  → AIResponseValidator
  → ResultAggregator / Normalizer / Deduplicator
  → ReportGenerator
  → Notify
  → Cleanup
```

`AnalyzeProcessor` запускает пять видов анализа — architecture, bugs, security,
performance и quality — с ограниченной параллельностью. Контекст ограничивается
по токенам, бинарные/слишком большие файлы пропускаются, `.env`, generated и
lock-файлы исключаются. `SecretRedactorService` маскирует ключи, bearer-токены,
пароли и private keys до chunking.

## Provider и надёжность

Бизнес-логика зависит только от `AIProvider`. Production provider использует
OpenAI-compatible OmniRouter API и модель из `AI_MODEL` (по умолчанию
`deepseek/deepseek-chat`). Есть timeout, exponential retry только для временных
ошибок, дневная quota, input/output token accounting и общий concurrency limit.
Ключ обязателен в production и никогда не логируется. `MockAIProvider` разрешён
только для тестов и локальной проверки.

## Данные

- `AnalysisContext` хранит redacted chunks и cache key; одинаковый исходный
  контекст повторно используется между анализами.
- `AIRequest` хранит prompt, chunk, модель, статус и token counters.
- `AIResponse` хранит исходный и валидированный JSON, latency и ошибку.
- `AIUsage` агрегирует запросы и токены на пользователя/проект/анализ.

Ответ принимается только как JSON с валидными severity/category и обязательными
полями issues. Невалидный ответ завершает запрос ошибкой и не попадает в findings.

## Отчёт Stage 9.3

Issues нормализуются, похожие дубликаты удаляются Jaccard-сравнением внутри
file/category buckets. Score 0–100 использует веса Security 30%, Architecture
25%, Bugs 25%, Quality/Performance/Style/Documentation 20%. Worker сохраняет
`Report` и `Finding`, а Markdown/JSON builders формируют детерминированные
артефакты. Report job идемпотентен; terminal failure сохраняет `FAILED` и всегда
ставит cleanup.

## Проверка

```bash
yarn test:stage9
RUN_WORKER_E2E=true yarn workspace @reviewsha/worker vitest run \
  tests/integration/full-pipeline.integration.test.ts --coverage=false
```

Вторая команда требует PostgreSQL, Redis и MinIO.
