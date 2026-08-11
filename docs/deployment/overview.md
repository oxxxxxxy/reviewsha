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
              OmniRoute Service
                    ↓
              AI provider(s)
```

The Helm chart deploys API, Worker, Web, Admin and (when enabled) an internal
OmniRoute Deployment/Service with a persistent data volume. Worker calls it via
the in-cluster URL `http://omniroute:20128/v1`. Production PostgreSQL, Redis and
MinIO are configured through env/secret values; OmniRoute credentials are kept
in its Kubernetes Secret.

## Deployment invariants

- immutable image tags for release;
- production secrets are external and never committed;
- migrations run before API rollout when required;
- readiness/liveness and rollout status must pass;
- smoke tests verify API, Web, Worker, upload, queue and OmniRoute paths;
- Admin AI control center can read/test the configured gateway without exposing
  the provider key.
