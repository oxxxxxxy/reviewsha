# Docker

## Development infrastructure

Root `docker-compose.yml` is the convenient local entrypoint for PostgreSQL,
Redis, MinIO and bucket initialization. The canonical infrastructure compose
files are under `infrastructure/docker/`.

```bash
docker compose config
docker compose up -d postgres redis minio minio-create-buckets
docker compose ps
docker compose logs -f postgres redis minio
```

`infrastructure/docker/compose.dev.yml` is validated in CI and can be used when
you need the complete development compose definition.

## Production images

```bash
docker build -f apps/api/Dockerfile -t reviewsha-api:<tag> .
docker build -f apps/worker/Dockerfile -t reviewsha-worker:<tag> .
docker build -f apps/web/Dockerfile -t reviewsha-web:<tag> .
docker build -f apps/admin/Dockerfile -t reviewsha-admin:<tag> .
```

Push images to the configured registry, then set the same immutable tag in
`helm/reviewsha/values.prod.yaml` or an override file.

## Image responsibilities

- API image runs compiled NestJS API and Prisma runtime assets required by
  migrations/startup.
- Worker image runs compiled processors and has no public HTTP endpoint.
- Web/Admin images serve Vite production bundles through their web server.

Do not put `.env`, source secrets or local database volumes into images.
