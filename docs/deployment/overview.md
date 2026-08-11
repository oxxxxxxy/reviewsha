# Deployment overview

Deployment tiers:

```text
local host + Compose infrastructure
  → production Docker images
  → Kubernetes resources
  → Helm release
```

## Production topology

```text
Internet
  ↓
Ingress/TLS
  ├── Web service
  ├── Admin service
  └── API service
          ├── PostgreSQL (external)
          ├── Redis (external)
          └── MinIO/S3 (external)
                    ↓
                 BullMQ
                    ↓
                 Worker
                    ↓
              AI provider
```

The Helm chart deploys API, Worker, Web and Admin. Production PostgreSQL,
Redis and MinIO are external dependencies configured through env/secret values.

## Deployment invariants

- immutable image tags for release;
- production secrets are external and never committed;
- migrations run before API rollout when required;
- readiness/liveness and rollout status must pass;
- smoke tests verify API, Web, Worker, upload and queue path.
