# Rollback

## Application rollback

Find the release revision:

```bash
helm history reviewsha -n reviewsha
```

Rollback to a known-good revision:

```bash
scripts/deploy/helm-rollback.sh <revision>
kubectl rollout status deployment/reviewsha-api -n reviewsha
kubectl rollout status deployment/reviewsha-worker -n reviewsha
```

Verify health, logs, queue consumption and a read-only API flow.

## Image-only rollback

If the Helm revision is not suitable, deploy a values override with the previous
immutable image tag and run the normal atomic deployment procedure.

## Database changes

Application rollback does not automatically rollback Prisma migrations. If the
new migration is backward-compatible, rollback code first and apply a forward
fix later. If not, follow the approved database restore/forward-migration plan
with an operator and backup verification. Do not delete migration history or run
`prisma migrate reset` in production.

## Incident notes

Record release/image tag, migration status, failed health check, rollback revision,
root cause and follow-up docs/tests in the incident/PR notes.
