# Stage 6.1 — File Storage (MinIO)

**Status: ✅ COMPLETE**

## Архитектура

`StorageModule` экспортирует `StorageService` и `MinioProvider`. MinIO SDK используется
только в `MinioProvider`; Upload, Worker, Reports и AI Pipeline должны зависеть от
абстракции `StorageService`.

Поддерживаются bucket'ы `projects`, `reports` и `temp`, автоматическое создание bucket'ов,
потоковые upload/download, metadata, exists, copy, move, delete и presigned GET URL.

## Безопасность и ошибки

Объектные ключи передаются отдельно от пользовательских имён файлов. Metadata поддерживает
MIME type, checksum, ownerId, projectId и uploadId. Ошибки MinIO преобразуются в
`ObjectNotFoundException`, `StorageUnavailableException`, `UploadFailedException`,
`DownloadFailedException` и `InvalidBucketException`.

## Проверки

```bash
yarn test:stage6
yarn workspace @reviewsha/api typecheck
yarn workspace @reviewsha/api lint
yarn ci:local
```
