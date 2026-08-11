# Troubleshooting

## API не стартует

```bash
kubectl logs deployment/reviewsha-api -n reviewsha
kubectl describe pod -l app.kubernetes.io/component=api -n reviewsha
```

Проверьте production env validation, DATABASE_URL, миграции и доступность
PostgreSQL/Redis/MinIO. Не подменяйте ошибку секретами в logs.

## Worker не обрабатывает jobs

Проверьте Redis connectivity, queue names, Worker logs, attempts и
`WORKER_REDIS_REQUIRED`. API и Worker должны использовать одну Redis instance и
совместимые shared queue contracts.

## Upload не работает

Проверьте MinIO health, credentials, buckets, endpoint из сети API/Worker,
free disk и ZIP validation errors. Metadata в PostgreSQL не гарантирует наличие
object — проверяйте оба слоя.

## AI не отвечает

Проверьте `AI_PROVIDER`, `OMNIROUTER_API_KEY`, base URL, model, timeout/quota,
Worker logs и failed jobs. Для локальной диагностики используйте mock/local
provider, чтобы отделить queue issue от provider issue.

## Frontend получает 401/403

Проверьте API base URL, access/refresh cookie/token state, JWT issuer/audience,
clock skew, CORS и ownership/role. `403` для чужого project/admin route —
ожидаемое security behavior, а не повод отключать guard.

## Helm не рендерится

```bash
helm lint helm/reviewsha
helm template reviewsha helm/reviewsha -f helm/reviewsha/values.prod.yaml --debug
```

Проверьте required values, secretName, image fields, namespace и indentation
values. Для schema errors используйте kubeconform из CI.
