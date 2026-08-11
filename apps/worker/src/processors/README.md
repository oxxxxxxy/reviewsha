# Worker processors

Processors получают небольшие identifier-based payloads из BullMQ и выполняют
идемпотентные шаги pipeline: download, safe extract, parse, merge, analyze,
report, notify и cleanup.

Processor обязан:

- валидировать job payload;
- быть безопасным для повторного выполнения;
- обновлять progress/terminal state;
- не логировать secrets, полный prompt или archive content;
- иметь unit/integration tests.
