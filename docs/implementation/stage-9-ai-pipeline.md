# Этап 9 — AI Pipeline

## 9.1 Подготовка контекста

Worker AI layer находится в `apps/worker/src/ai` и состоит из:

- `AIProjectParser` — тип проекта, языки, категории и исключение generated,
  lock и secret файлов;
- `ChunkBuilderService` — file/module/architecture chunks с ограничением
  приблизительных токенов;
- `ContextBuilderService` — выбор релевантных chunks под задачу;
- `PromptBuilderService` — единый system/user prompt и JSON output contract.

## 9.2 Provider abstraction

`AIProvider` скрывает конкретный LLM API. `OmniRouterProvider` вызывает
OpenAI-compatible endpoint и получает ключ, model, timeout и limits из ENV.
`AIResponseValidator` не допускает невалидный JSON или неизвестный severity.
Полный код проекта, ключи и `.env` не включаются в prompt.

## 9.3 Reporting

Reporting layer нормализует issues, удаляет дубликаты, рассчитывает score и
строит Markdown/JSON. API `ReportsModule` даёт пользователю чтение отчётов,
историю проекта, удаление, export MD/JSON и compare двух версий.
