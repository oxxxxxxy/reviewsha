#!/usr/bin/env bash
set -euo pipefail

RELEASE="${HELM_RELEASE:-reviewsha}"
NAMESPACE="${HELM_NAMESPACE:-reviewsha}"
CHART="${HELM_CHART:-helm/reviewsha}"
VALUES="${HELM_VALUES:-helm/reviewsha/values.prod.yaml}"

helm upgrade --install "$RELEASE" "$CHART" \
  --namespace "$NAMESPACE" --create-namespace \
  --values "$VALUES" --atomic --wait \
  --timeout "${HELM_TIMEOUT:-10m}"

for deployment in api worker web admin; do
  kubectl rollout status "deployment/${RELEASE}-${deployment}" \
    --namespace "$NAMESPACE" --timeout="${HELM_TIMEOUT:-10m}"
done
