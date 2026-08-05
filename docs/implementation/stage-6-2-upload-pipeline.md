# Stage 6.2 — Upload Pipeline

**Status: ✅ COMPLETE**

## Реализовано в текущем шаге

- `UploadsModule`, controller, service, mapper, events and ZIP validator.
- `POST /api/v1/projects/:projectId/uploads` and upload history endpoint.
- Ownership check через `ProjectRepository` и ADMIN override.
- ZIP extension/MIME, corruption, empty archive, forbidden paths, entry count,
  unpacked-size and compression-ratio validation.
- SHA-256 checksum, generated storage key and MinIO integration through `StorageService`.
- `UploadStatus`, sequential version and migration
  `20260805200037_add_upload_status_and_version`.
- 46 focused unit and HTTP integration tests for validator, upload service,
  repository-facing behavior, mapper/storage integration and API contracts.

## Проверки

Focused unit and HTTP integration tests run through `yarn test:stage6`; full local
GitHub Actions parity is verified with `yarn ci:local`. Queue integration intentionally
starts in Stage 7.1 through the published `upload.completed` event.
