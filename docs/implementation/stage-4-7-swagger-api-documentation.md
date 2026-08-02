# Stage 4.7 Swagger & API Documentation

Status: COMPLETE

## Summary

Stage 4.7 promotes Swagger/OpenAPI to the primary API contract artifact for Backend, Frontend and SDK work.

## Implemented artifacts

```txt
apps/api/src/swagger/
├── generate-openapi.ts
└── swagger.config.ts

apps/api/src/common/swagger/
└── api-standard-errors.decorator.ts

apps/api/src/common/dto/
└── api-error-response.dto.ts
```

## Runtime endpoints

```txt
/api/v1/docs
/api/v1/docs-json
```

## OpenAPI

The generated document uses OpenAPI `3.1.0`, includes project metadata, repository link, contact, license, `/api/v1` server and JWT Bearer security scheme.

## Documentation standards

- controllers are grouped with tags;
- public endpoints are explicitly marked with `@Public()` and do not require bearer auth;
- protected endpoints expose `@ApiBearerAuth('bearer')`;
- DTOs use `@ApiProperty()` / `@ApiPropertyOptional()`;
- normalized errors use `ApiErrorResponseDto`;
- `operationIdFactory` produces stable operation IDs for SDK generation.

## CI integration

OpenAPI generation is checked by:

```bash
yarn docs:openapi
```

The GitHub Actions workflow has a dedicated `openapi-docs` job so API-contract generation is visible separately from application build.
