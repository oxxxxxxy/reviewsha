# Kubernetes

The application workloads are `api`, `worker`, `web` and `admin`. PostgreSQL,
Redis and MinIO are configured as external dependencies in production values.
Real secrets must be provided by a secret manager or a separately managed
Kubernetes Secret; the example files contain placeholders only.

The Helm chart is the canonical deployment path:

```bash
helm lint helm/reviewsha
helm template reviewsha helm/reviewsha -f helm/reviewsha/values.prod.yaml
helm upgrade --install reviewsha helm/reviewsha -f helm/reviewsha/values.prod.yaml
kubectl rollout status deployment/reviewsha-api -n reviewsha
```
