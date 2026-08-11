# Production checklist

## Infrastructure

- [ ] DNS и TLS настроены.
- [ ] PostgreSQL backup/retention проверены.
- [ ] Redis доступен и имеет persistence policy.
- [ ] MinIO/S3 buckets и lifecycle настроены.
- [ ] Kubernetes namespace и secret manager готовы.

## Release

- [ ] Images собраны и опубликованы с immutable tag.
- [ ] Helm lint/template/kubeconform проходят.
- [ ] Production values не содержат secrets.
- [ ] Prisma migration plan одобрен.
- [ ] Rollback revision и previous image известны.

## Runtime

- [ ] API/Worker/Web/Admin pods ready.
- [ ] Liveness/readiness probes проходят.
- [ ] `/api/v1/health` отвечает 200.
- [ ] API logs и Kubernetes events доступны.
- [ ] Worker принимает тестовую job.
- [ ] Upload и report storage работают.
- [ ] AI provider/quota/usage работают.
- [ ] Chat REST/SSE smoke flow работает.
- [ ] Admin queues/logs/statistics доступны.

## After deploy

- [ ] Проведён authenticated smoke test.
- [ ] Нет всплеска 5xx/failed jobs.
- [ ] Queue latency приемлема.
- [ ] Release/image/migration metadata записаны.
