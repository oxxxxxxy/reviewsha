# AI pipeline

## Code review pipeline

```text
Upload/version
   ↓
Download + safe extract
   ↓
Parser / project classification
   ↓
Chunk builder (token-aware)
   ↓
Context selection
   ↓
Structured prompt builder
   ↓
OmniRouter/provider
   ↓
AI processor validation
   ↓
Finding normalization/deduplication
   ↓
Weighted report generation
   ↓
Persist report + exports + usage
```

Каждый этап принимает identifiers и ограниченный context. Полный архив и
неограниченная история не отправляются provider-у.

## Provider boundary

Worker обращается к provider через abstraction/OmniRouter. API controller не
вызывает DeepSeek/OpenAI напрямую. Provider response валидируется до записи
результата; невалидный JSON или недопустимые severity/fields переводят job в
ошибку, а не создают пустой успешный report.

## Limits and reliability

- `AI_INPUT_MAX_TOKENS` ограничивает вход;
- `AI_MAX_TOKENS` ограничивает output вместе со скрытым reasoning; для
  структурированного JSON-review по умолчанию используется `6000`, чтобы
  reasoning-capable модели не исчерпали бюджет до выдачи JSON;
- `AI_TIMEOUT_MS`, retry attempts и delay задают recovery;
- `AI_MAX_CONCURRENCY` ограничивает параллельные запросы;
- `AI_DAILY_REQUEST_LIMIT` задаёт quota;
- Повторная попытка BullMQ переиспользует AI-request по логическому ключу
  проекта/файла, поэтому retry не создаёт дублирующие проверки и не увеличивает
  progress denominator (`0/2 → 0/4 → 0/6`). При повторном запуске завершившегося
  с ошибкой pipeline старые request/usage rows очищаются перед re-enqueue.
- chat отдельно ограничивает message/context/timeout/cache.

## Chat context

Chat собирает system instructions, project metadata, relevant analysis/context,
summary и recent messages. Memory и summary сокращают старую историю. SSE
stream проходит через Worker/Redis broker/API; успешный полный assistant response
сохраняется после завершения.

## Usage and observability

AI request status, provider/model, token counters, latency и errors сохраняются
в usage layer для Admin. Логи содержат identifiers и outcome, но не API keys,
JWT или полный sensitive prompt.
