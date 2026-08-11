# Этап 8.2 — Processing Jobs

> **Historical implementation note.** This document records an earlier plan or execution checkpoint. It is retained for traceability; current behavior is defined by code and the canonical docs index.

Worker реализует файловую цепочку `Download → Extract → Parse → Merge →
Cleanup` в file queue BullMQ.

## Обработчики

- `DownloadProcessor` получает `UploadedFile`, скачивает объект через
  `WorkerStorageService`, сохраняет `archive.zip` в изолированный workspace и
  проверяет размер и SHA-256.
- `ExtractProcessor` использует `ArchiveService`. ZIP распаковывается потоково;
  проверяются Zip Slip, число файлов, глубина каталогов и итоговый размер.
- `ParseProcessor` индексирует структуру исходников через `ParserService`,
  определяет TypeScript, JavaScript, Python, Java и Go, считает файлы, байты,
  строки и SHA-256 каждого файла.
- `MergeProcessor` объединяет результаты в `output/context.json`.
- `CleanupProcessor` удаляет workspace даже при повторном запуске; удаление
  выполняется через `force`, поэтому операция идемпотентна.

## Workspace

```text
/tmp/reviewsha/jobs/{pipelineId}/
├── source/archive.zip
├── extracted/
└── output/{download,extract,parse,context}.json
```

В Redis передаются только `uploadId`, `projectId`, `pipelineId` и идентификаторы
job. ZIP и исходники в payload не помещаются.

## Тестирование

Worker CI запускает единый `yarn test:stage8`, который выполняет тесты Worker,
сборку, typecheck и lint. Покрыты registry, workspace, архивы, парсер, merge,
health и очередь; тесты не требуют запуска MinIO или Redis для unit-проверок.
