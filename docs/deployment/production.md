# Production deployment

## 1. Build and publish

```bash
tag=<immutable-release-tag>
docker build -f apps/api/Dockerfile -t registry.example/reviewsha-api:$tag .
docker build -f apps/worker/Dockerfile -t registry.example/reviewsha-worker:$tag .
docker build -f apps/web/Dockerfile -t registry.example/reviewsha-web:$tag .
docker build -f apps/admin/Dockerfile -t registry.example/reviewsha-admin:$tag .
docker push registry.example/reviewsha-api:$tag
docker push registry.example/reviewsha-worker:$tag
docker push registry.example/reviewsha-web:$tag
docker push registry.example/reviewsha-admin:$tag
```

Replace the registry with the actual trusted registry.

## 2. Configure dependencies and secrets

Provision PostgreSQL, Redis and MinIO/S3. Create the Kubernetes Secret referenced
by Helm, including production `DATABASE_URL`, JWT secrets, internal API key,
storage credentials and remote AI key. Do not commit its values.

## 3. Validate and deploy

```bash
helm lint helm/reviewsha
helm template reviewsha helm/reviewsha -f helm/reviewsha/values.prod.yaml > /tmp/reviewsha.yaml
HELM_VALUES=helm/reviewsha/values.prod.yaml \
  HELM_TIMEOUT=15m scripts/deploy/helm-deploy.sh
```

## 4. Verify

```bash
kubectl get pods -n reviewsha
kubectl rollout status deployment/reviewsha-api -n reviewsha
kubectl rollout status deployment/reviewsha-worker -n reviewsha
curl -fsS https://<host>/api/v1/health
```

Then run authenticated smoke flows for login, project/upload, pipeline/report and
chat. Check queue and error logs before announcing the release.

## Migrations

Apply Prisma migrations as a controlled pre-rollout step or approved Helm hook.
Never run development `prisma migrate dev`, `prisma reset` or seed against
production. Take/verify a database backup before destructive schema changes.
