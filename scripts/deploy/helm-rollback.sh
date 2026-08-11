#!/usr/bin/env bash
set -euo pipefail

RELEASE="${HELM_RELEASE:-reviewsha}"
NAMESPACE="${HELM_NAMESPACE:-reviewsha}"
REVISION="${1:?Usage: helm-rollback.sh <revision>}"

helm rollback "$RELEASE" "$REVISION" \
  --namespace "$NAMESPACE" --wait \
  --timeout "${HELM_TIMEOUT:-10m}"

for deployment in api worker web admin; do
  kubectl rollout status "deployment/${RELEASE}-${deployment}" \
    --namespace "$NAMESPACE" --timeout="${HELM_TIMEOUT:-10m}"
done
