# Kubernetes

The chart is the canonical Kubernetes deployment path. Bare examples in `k8s/`
show namespace/config/secret concepts; production values should be managed by
Helm and a secret manager.

## Resources

- Namespace;
- ConfigMap for non-secret runtime configuration;
- externally managed Secret (`reviewsha-secrets` by default);
- Deployments and Services for API, Worker, Web and Admin;
- optional internal OmniRoute Deployment/Service and PVC;
- optional Ingress/TLS;
- optional HPA.

PostgreSQL, Redis and MinIO are external production dependencies in the chart.
When `omniroute.enabled=true`, Worker uses the internal `omniroute` Service and
the gateway data directory is mounted from the configured PVC.

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
kubectl logs deployment/reviewsha-worker -n reviewsha
kubectl logs deployment/reviewsha-omniroute -n reviewsha
```

Use `kubectl describe` and events for scheduling/probe/image failures.

## OmniRoute configuration

Create the referenced gateway Secret outside Git and configure the image/PVC in
Helm values. The application Secret must contain the runtime values needed by
API/Worker (`INTERNAL_API_KEY`, `OMNIROUTER_BASE_URL` and provider settings).
The Admin AI control center writes only encrypted runtime overrides to
PostgreSQL; it never writes a provider key into a ConfigMap or returns it to
the browser.
