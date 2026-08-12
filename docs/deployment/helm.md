# Helm

Chart: `helm/reviewsha`.

## Values

- `values.yaml` — safe defaults;
- `values.dev.yaml` — development-oriented overrides;
- `values.prod.yaml` — production shape without real secrets.

Set image repositories/tags, replicas, resources, ingress, external endpoints
and `secretName` through an override file or `--set`. Keep secrets outside Git.

## Validate and render

```bash
helm lint helm/reviewsha
helm template reviewsha helm/reviewsha -f helm/reviewsha/values.dev.yaml
helm template reviewsha helm/reviewsha -f helm/reviewsha/values.prod.yaml
```

CI additionally validates rendered resources with kubeconform.

## Install/upgrade

```bash
HELM_VALUES=helm/reviewsha/values.prod.yaml \
  scripts/deploy/helm-deploy.sh
```

The script uses `helm upgrade --install --atomic --wait`, then waits for API,
Worker, Web and Admin rollout. A migration hook may run Prisma migrations before
workloads when included in the current chart revision.

## Configuration rules

Use immutable image tags, explicit production `secretName`, real domain/TLS and
external PostgreSQL/Redis/MinIO endpoints. Keep `worker.persistence.enabled`
on for multi-replica workers and provide RWX storage in production; the
validation profile uses a single-node RWO PVC. `secrets.create=false` is the
safe production default.
