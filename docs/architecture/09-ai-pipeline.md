# AI Pipeline проекта "Ревьюша"

Подготовка контекста начинается в Worker Stage 8.2: `Download → Extract → Parse
→ Merge → Cleanup`. Результат `Merge` (`context.json`) является входом для
следующих этапов AI Pipeline и не содержит сам ZIP или секреты.

## 1. Назначение документа

Этот документ описывает архитектуру искусственного интеллекта в системе:

- подготовку контекста;
- анализ исходного кода;
- взаимодействие с LLM;
- структуру промптов;
- обработку результатов;
- генерацию рекомендаций;
- AI чат.

Используемые технологии:

```
DeepSeek

+

OmniRoute

+

AI Provider Layer
```

---

# 2. Роль AI в системе

AI выполняет роль виртуального Code Reviewer.

Он анализирует:

- качество кода;
- архитектуру;
- потенциальные баги;
- безопасность;
- производительность;
- соответствие best practices.

---

AI НЕ заменяет:

- компилятор;
- тестирование;
- статические анализаторы.

Он является дополнительным уровнем анализа.

---

# 3. Общая архитектура AI слоя

```
                Worker

                  |

             AI Service

                  |

          AI Provider Interface

                  |

              OmniRoute

                  |

              DeepSeek

                  |

             AI Response
```

---

# 4. AI Provider Layer

Для независимости от модели используется абстракция.

Интерфейс:

```
AIProvider
```

---

Методы:

```
analyzeCode()

generateSuggestion()

chat()

summarize()
```

---

Реализации:

```
providers/

├── deepseek.provider.ts

├── claude.provider.ts

└── local.provider.ts
```

---

Замена модели:

Было:

```
DeepSeek
```

Стало:

```
Claude

или

Local LLM
```

не требует изменения pipeline.

---

# 5. Основной pipeline анализа

Полный процесс:

```
Project Upload

↓

File Extraction

↓

Project Understanding

↓

Code Chunking

↓

AI Analysis

↓

Issue Aggregation

↓

Report Generation
```

---

# 6. Этап 1. Анализ проекта

После загрузки проекта система определяет:

- язык;
- фреймворк;
- структуру;
- зависимости.

---

Пример результата:

```json
{
 "language": "TypeScript",
 "framework": "NestJS",
 "database": "PostgreSQL",
 "files": 245
}
```

---

Используется:

- package.json;
- requirements.txt;
- pom.xml;
- go.mod;
- структура каталогов.

---

# 7. Этап 2. Подготовка файлов

Перед AI анализом исключаются:

Не анализируем:

```
node_modules

dist

build

.git

coverage
```

---

Оставляем:

```
src/

configs/

package.json

README.md
```

---

# 8. Этап 3. Chunking

LLM имеет ограничение контекста.

Поэтому код разбивается.

---

Пример:

```
auth.service.ts

2000 строк

↓

Chunk 1

Chunk 2

Chunk 3
```

---

Каждый chunk содержит:

```
filename

language

code

imports

related files

project context
```

---

# 9. Контекст для AI

AI получает не только код.

Контекст:

```
Project Description

+

Language

+

Framework

+

File Role

+

Code

+

Rules
```

---

Пример:

```
Ты опытный Senior Backend Developer.

Проанализируй этот NestJS сервис.

Найди:

1. Bugs

2. Security issues

3. Architecture problems

4. Performance problems

Верни JSON.
```

---

# 10. Структура AI ответа

Ответ модели НЕ сохраняется напрямую.

Сначала проходит валидацию.

---

Формат:

```json
{
 "issues": [
  {
   "title": "SQL injection risk",
   "severity": "HIGH",
   "description": "...",
   "suggestion": "...",
   "line": 42
  }
 ]
}
```

---

# 11. Response Parser

После ответа AI:

```
AI Response

↓

Validator

↓

Parser

↓

Database
```

---

Проверяется:

- JSON формат;
- обязательные поля;
- severity;
- корректность файла.

---

# 12. Категории анализа

Каждый анализ имеет категории.

---

## Architecture

Проверяет:

- SOLID;
- зависимости;
- структуру проекта.

---

## Bugs

Ищет:

- ошибки логики;
- неправильную обработку данных.

---

## Security

Ищет:

- утечки;
- небезопасный код;
- неправильную авторизацию.

---

## Performance

Проверяет:

- лишние запросы;
- неоптимальные операции.

---

## Style

Проверяет:

- читаемость;
- поддерживаемость.

---

# 13. Severity система

Каждая проблема получает уровень:

```
CRITICAL

HIGH

MEDIUM

LOW

INFO
```

---

Пример:

CRITICAL:

```
Hardcoded secret
```

HIGH:

```
Broken authorization
```

MEDIUM:

```
Bad architecture decision
```

LOW:

```
Naming issue
```

---

# 14. AI расходование

Каждый запрос записывается:

Таблица:

```
AIRequest
```

---

Хранится:

```
model

tokensInput

tokensOutput

cost

duration
```

---

Используется для:

- статистики;
- тарифов;
- оптимизации промптов.

---

# 15. Оптимизация стоимости

Методы:

## Дешёвый первый проход

Модель анализирует:

- структуру;
- подозрительные места.

---

## Глубокий анализ

Запускается только для:

- важных файлов;
- найденных проблем.

---

## Кэширование

Если файл не изменился:

```
hash совпадает

↓

не анализировать повторно
```

---

# 16. AI Chat

Отдельный режим.

Пользователь:

```
Почему это ошибка?
```

---

Pipeline:

```
Question

↓

Project Context

↓

Related Issues

↓

AI

↓

Answer
```

---

AI знает:

- проект;
- предыдущий отчёт;
- конкретные замечания.

---

# 17. История изменений качества

Поддержка:

```
Scan #1

↓

Scan #2

↓

Scan #3
```

---

Можно сравнить:

```
Было:

25 проблем


Стало:

10 проблем
```

---

# 18. Защита от галлюцинаций

AI должен:

- ссылаться на конкретный файл;
- указывать строки;
- не придумывать код;
- не утверждать неизвестное.

---

Если уверенность низкая:

```
confidence: LOW
```

---

# 19. Будущее развитие

Возможные функции:

## Автоисправления

```
Issue

↓

AI Patch

↓

Pull Request
```

---

## RAG

Индексирование:

- документации;
- best practices;
- внутренних правил.

---

## Code Agent

Автономный агент:

- анализирует;
- предлагает изменения;
- создаёт PR.

---

# 20. Итоговый pipeline

```
                Project

                  |

              File Parser

                  |

              Chunk Builder

                  |

              AI Queue

                  |

              DeepSeek

                  |

            Response Parser

                  |

        --------------------

        |                  |

      Issues            Report

        |

    User Feedback
```

Главный принцип:

> AI является отдельным слоем системы. Его можно заменить, масштабировать и улучшать независимо от остального продукта.
