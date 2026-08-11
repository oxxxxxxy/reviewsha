# Worker services

Worker services адаптируют внешние зависимости: storage/MinIO, parser, AI
provider, report generator и queue infrastructure. Они не принимают HTTP и не
содержат frontend concerns.

Новый service должен иметь узкий contract, обработку transient/permanent errors,
тесты и описание в [Worker guide](../../../../docs/architecture/worker.md).
