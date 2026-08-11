# Этапы 16–19: GitHub, Docker, Kubernetes и Helm

## GitHub (16.1)

GitHub Actions проверяет monorepo на push и pull request: install, lint,
typecheck, format, build, tests, OpenAPI и stage checks. Добавлены PR template,
bug/feature issue templates и ежемесячный Dependabot workflow.

## Docker (17.1–17.2)

Development compose находится в `infrastructure/docker/compose.dev.yml` и
описывает PostgreSQL, Redis, MinIO, API, Worker, Web и Admin. Сервисы используют
healthchecks и именованные volumes. Production multi-stage Dockerfiles созданы
для API, Web и Admin; Worker использует отдельный runtime image.

```bash
docker compose -f infrastructure/docker/compose.dev.yml config
docker compose -f infrastructure/docker/compose.dev.yml up -d --build
```

Команда `config` проверяет compose без запуска и изменения уже работающих
контейнеров.

## Kubernetes (18.1–18.3)

В `k8s/base/` находятся namespace, ConfigMap и Secret examples. PostgreSQL,
Redis и MinIO в production предполагаются внешними зависимостями; реальные
secrets не коммитятся.

## Helm (19.1–19.3)

Канонический deployment chart находится в `helm/reviewsha/`. В values вынесены
images, tags, replicas, resources, environment, external dependencies, ingress
и TLS.

```bash
helm lint helm/reviewsha
helm template reviewsha helm/reviewsha -f helm/reviewsha/values.prod.yaml
helm upgrade --install reviewsha helm/reviewsha -f helm/reviewsha/values.prod.yaml
```

Production image tags должны быть Git SHA или version, не `latest`.
