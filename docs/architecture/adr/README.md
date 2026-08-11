# Architecture Decision Records

ADR фиксируют решения, которые влияют на несколько модулей. Формат:

```text
Context → Decision → Alternatives → Consequences
```

## Индекс

- [ADR-001: Monorepo и workspace boundaries](001-monorepo.md)
- [ADR-002: Worker отдельно от API](002-separate-worker.md)
- [ADR-003: OpenAPI как источник SDK contract](003-openapi-sdk.md)
- [ADR-004: Redis/BullMQ для async jobs](004-bullmq.md)
- [ADR-005: MinIO для object storage](005-minio.md)
- [ADR-006: SSE для chat streaming](006-chat-sse.md)
