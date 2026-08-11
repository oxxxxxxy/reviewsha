# Storage и MinIO

Uploads и report exports хранятся в приватном S3-compatible storage. В local
Compose это MinIO; API/Worker используют endpoint и credentials из env.

## Object flow

```text
multipart upload
  → validation/checksum
  → UploadedFile metadata in PostgreSQL
  → private MinIO object
  → version/scan job
  → report/export object
```

База данных хранит ownership/status/metadata, а не содержимое архива или PDF.
Ссылки на объекты выдаются через контролируемый API/presigned URL.

## Buckets

Local setup создаёт `projects`, `reports`, `temp`, `exports` и `avatars`. API
schema использует как минимум `MINIO_BUCKET_PROJECTS`, `MINIO_BUCKET_REPORTS` и
`MINIO_BUCKET_TEMP`; дополнительные buckets задаются infrastructure Compose.

## Правила

- bucket должен быть private;
- object key должен включать ownership-safe identifiers;
- имя файла нельзя использовать как единственный key;
- ZIP проверяется до обработки Worker;
- temporary objects удаляются после terminal state;
- credentials не логируются и не передаются клиенту.

Проверка local MinIO:

```bash
curl -fsS http://localhost:9000/minio/health/live
docker compose logs minio-create-buckets
```
