# Kubernetes

The chart is the canonical Kubernetes deployment path. Bare examples in `k8s/`
show namespace/config/secret concepts; production values should be managed by
Helm and a secret manager.

## Resources

- Namespace;
- ConfigMap for non-secret runtime configuration;
- externally managed Secret (`reviewsha-secrets` by default);
- Deployments and Services for API, Worker, Web and Admin;
- optional Ingress/TLS;
- optional HPA.

PostgreSQL, Redis and MinIO are external production dependencies in the chart.

## Preflight

```bash
kubectl cluster-info
helm version
helm lint helm/reviewsha
helm template reviewsha helm/reviewsha -f helm/reviewsha/values.prod.yaml
```

Create/configure the external secret before rollout. Never put real values into
`k8s/base/secret.example.yaml` or a committed values file.

## Verification

```bash
kubectl get pods -n reviewsha
kubectl get svc -n reviewsha
kubectl rollout status deployment/reviewsha-api -n reviewsha
kubectl rollout status deployment/reviewsha-worker -n reviewsha
kubectl logs deployment/reviewsha-api -n reviewsha
```

Use `kubectl describe` and events for scheduling/probe/image failures.
